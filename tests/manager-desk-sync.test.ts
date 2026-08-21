import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { buildManagerCatalog } from "../lib/manager/catalog";
import {
  DESK_SYNC_INTERVAL_MS,
  DESK_SYNC_PATH,
  deskSyncVersion,
  isDeskEditingTarget,
  reviewDecisionStamp,
  shouldHoldDeskRefresh,
  shouldRefreshDesk,
} from "../lib/manager/desk-sync";
import type { Training } from "../lib/father/types";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

function training(id: string, title: string): Training {
  return {
    id,
    slug: id,
    title,
    description: null,
    session_count: 6,
    order_index: 1,
    published: true,
    first_published_at: "2026-01-01T00:00:00.000Z",
    released_at: "2026-08-01T00:00:00.000Z",
    first_released_at: "2026-08-01T00:00:00.000Z",
  };
}

describe("shared leader desk stamp", () => {
  it("changes when one leader includes or declines a training", () => {
    const accepted = [
      {
        group_id: "nwa",
        training_id: "coming-home",
        status: "accepted",
        decided_at: "2026-08-21T01:00:00.000Z",
      },
    ];
    const declined = [
      {
        group_id: "nwa",
        training_id: "coming-home",
        status: "declined",
        decided_at: "2026-08-21T01:00:10.000Z",
      },
    ];

    assert.notEqual(reviewDecisionStamp(accepted), reviewDecisionStamp(declined));
    assert.notEqual(deskSyncVersion({ reviews: accepted }), deskSyncVersion({ reviews: declined }));
    assert.equal(
      deskSyncVersion({ reviews: accepted }),
      deskSyncVersion({ reviews: [...accepted] })
    );
  });

  it("changes when photos, certificates, assessments, or roster rows change", () => {
    const base = deskSyncVersion({
      reviews: [],
      photoCount: 1,
      photoAt: "2026-08-21T01:00:00.000Z",
      certificateCount: 1,
      certificateAt: "2026-08-21T01:00:00.000Z",
    });
    assert.notEqual(
      base,
      deskSyncVersion({
        reviews: [],
        photoCount: 2,
        photoAt: "2026-08-21T01:01:00.000Z",
        certificateCount: 1,
        certificateAt: "2026-08-21T01:00:00.000Z",
      })
    );
    assert.notEqual(
      base,
      deskSyncVersion({
        reviews: [],
        photoCount: 1,
        photoAt: "2026-08-21T01:00:00.000Z",
        certificateCount: 2,
        certificateAt: "2026-08-21T01:02:00.000Z",
      })
    );
    assert.notEqual(
      deskSyncVersion({
        assessmentAvailability: [
          {
            group_id: "nwa",
            training_id: "keystone",
            status: "available",
            decided_at: "2026-08-21T01:00:00.000Z",
          },
        ],
      }),
      deskSyncVersion({
        assessmentAvailability: [
          {
            group_id: "nwa",
            training_id: "keystone",
            status: "hidden",
            decided_at: "2026-08-21T01:00:10.000Z",
          },
        ],
      })
    );
  });

  it("is the same for every leader on the same organization", () => {
    const reviews = [
      {
        group_id: "nwa",
        training_id: "fundamentals",
        status: "accepted",
        decided_at: "2026-08-20T12:00:00.000Z",
      },
      {
        group_id: "nwa",
        training_id: "coming-home",
        status: "declined",
        decided_at: "2026-08-21T01:00:00.000Z",
      },
    ];
    const brenda = deskSyncVersion({ reviews, assignmentCount: 3 });
    const manager2 = deskSyncVersion({ reviews: [...reviews].reverse(), assignmentCount: 3 });
    assert.equal(brenda, manager2);
  });

  it("refreshes the open tab only after a peer changes the stamp", () => {
    assert.equal(shouldRefreshDesk(null, "a"), false);
    assert.equal(shouldRefreshDesk("a", "a"), false);
    assert.equal(shouldRefreshDesk("a", "b"), true);
    assert.equal(shouldHoldDeskRefresh({ hidden: true, editing: false }), true);
    assert.equal(shouldHoldDeskRefresh({ hidden: false, editing: true }), true);
    assert.equal(shouldHoldDeskRefresh({ hidden: false, editing: false }), false);
    assert.equal(isDeskEditingTarget({ tagName: "TEXTAREA" }), true);
    assert.equal(isDeskEditingTarget({ tagName: "BUTTON" }), false);
  });

  it("shows the same included and declined lists from the shared review rows", () => {
    const comingHome = training("coming-home", "Coming Home Present");
    const catalog = buildManagerCatalog({
      trainings: [comingHome],
      pending: [],
      accepted: [],
      declined: [{ training: comingHome, sessionCount: 6, groupId: "nwa" }],
    });
    assert.equal(catalog[0]?.status, "declined");
    const included = buildManagerCatalog({
      trainings: [comingHome],
      pending: [],
      accepted: [{ training: comingHome, sessionCount: 6, groupId: "nwa" }],
      declined: [],
    });
    assert.equal(included[0]?.status, "ready");
  });
});

describe("leader desk live loop", () => {
  it("polls a manager-only stamp and refreshes every Leader desk", () => {
    const layout = readRepo("app/(manager)/layout.tsx");
    const route = readRepo("app/api/manager/desk-sync/route.ts");
    const client = readRepo("components/manager/desk-sync.tsx");
    const reviews = readRepo("lib/manager/reviews.ts");
    const decide = readRepo("lib/manager/review-actions.ts");

    assert.equal(DESK_SYNC_PATH, "/api/manager/desk-sync");
    assert.equal(DESK_SYNC_INTERVAL_MS, 2000);
    assert.match(layout, /<ManagerDeskSync/);
    assert.match(route, /getAuthContext/);
    assert.match(route, /role !== "manager"/);
    assert.match(route, /loadManagerDeskSyncVersion/);
    assert.match(client, /router\.refresh/);
    assert.match(client, /DESK_SYNC_PATH/);
    assert.match(reviews, /\.in\("group_id", groupIds\)/);
    assert.doesNotMatch(reviews, /decided_by:\s*user/);
    assert.match(decide, /\.eq\("group_id", groupId\)/);
    assert.match(decide, /review_accepted/);
    assert.match(decide, /review_declined/);
    assert.doesNotMatch(decide, /manager_id/);
    const photos = readRepo("lib/org-photos/actions.ts");
    const assessments = readRepo("lib/assessments/data.ts");
    const sync = readRepo("lib/manager/desk-sync.ts");
    assert.match(photos, /recordOrganizationActivity/);
    assert.match(assessments, /loadOrgManagerIds/);
    assert.match(sync, /organization_photos/);
    assert.match(sync, /certificates/);
    assert.match(sync, /session_progress/);
    assert.match(sync, /organization_assessment_reviews/);
    assert.match(sync, /organization_assessment_availability/);
    assert.match(sync, /manager_participant_notes/);
    const peer = readRepo("supabase/migrations/20260821050000_peer_custom_assessments.sql");
    assert.match(peer, /manages_same_organization_as/);
    assert.match(peer, /owns_custom_assessment/);
  });
});
