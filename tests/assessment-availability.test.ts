import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  KEYSTONE_ASSESSMENT_KEY,
  fatherCanStartAssessment,
  isAssessmentAvailable,
  leaderCanStartAssessment,
  primaryFatherGroupId,
} from "../lib/assessments/availability";
import {
  buildManagerAssessmentCatalog,
  partitionAssessmentCatalog,
} from "../lib/assessments/catalog";
import {
  catalogVisibility,
  organizationMayOfferAssessment,
  type PlatformAssessmentRelease,
} from "../lib/assessments/reviews";
import type { AssessmentListItem } from "../lib/assessments/types";

const groups = [
  { id: "g1", name: "Returning Home NWA" },
  { id: "g2", name: "Second group" },
];

const custom: AssessmentListItem = {
  id: "a1",
  manager_id: "m1",
  title: "Skill check",
  description: null,
  created_at: "2026-08-18T00:00:00Z",
  updated_at: "2026-08-18T00:00:00Z",
  questionCount: 4,
  assignedCount: 1,
  completedCount: 0,
};

const released: PlatformAssessmentRelease = {
  assessment_key: KEYSTONE_ASSESSMENT_KEY,
  released_at: "2026-08-18T12:00:00Z",
  first_released_at: "2026-08-18T12:00:00Z",
  released_by: "admin-1",
};

const unreleasedAfterFirst: PlatformAssessmentRelease = {
  ...released,
  released_at: null,
};

describe("assessment availability", () => {
  it("treats a missing row as available", () => {
    assert.equal(isAssessmentAvailable([], "g1", KEYSTONE_ASSESSMENT_KEY), true);
  });

  it("hides Keystone when the home group removed it, unless the father already started", () => {
    const rows = [
      { group_id: "g1", assessment_key: KEYSTONE_ASSESSMENT_KEY, status: "hidden" as const },
    ];
    assert.equal(
      fatherCanStartAssessment({
        rows,
        groupIds: ["g1"],
        homeGroupId: "g1",
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
      }),
      false
    );
    assert.equal(
      fatherCanStartAssessment({
        rows,
        groupIds: ["g1"],
        homeGroupId: "g1",
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        hasProgress: true,
      }),
      true
    );
  });

  it("keeps Keystone open before Super-admin starts Leader review", () => {
    assert.equal(
      fatherCanStartAssessment({
        rows: [],
        groupIds: ["g1"],
        homeGroupId: "g1",
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        release: null,
        reviewStatus: null,
      }),
      true
    );
  });

  it("blocks new starts after release until the Leader accepts and shares", () => {
    assert.equal(
      fatherCanStartAssessment({
        rows: [],
        groupIds: ["g1"],
        homeGroupId: "g1",
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        release: released,
        reviewStatus: "pending",
      }),
      false
    );
    assert.equal(
      fatherCanStartAssessment({
        rows: [],
        groupIds: ["g1"],
        homeGroupId: "g1",
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        release: released,
        reviewStatus: "accepted",
      }),
      false
    );
    assert.equal(
      fatherCanStartAssessment({
        rows: [
          { group_id: "g1", assessment_key: KEYSTONE_ASSESSMENT_KEY, status: "available" },
        ],
        groupIds: ["g1"],
        homeGroupId: "g1",
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        release: released,
        reviewStatus: "accepted",
      }),
      true
    );
    assert.equal(
      fatherCanStartAssessment({
        rows: [
          { group_id: "g1", assessment_key: KEYSTONE_ASSESSMENT_KEY, status: "available" },
        ],
        groupIds: ["g1"],
        homeGroupId: "g1",
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        release: released,
        reviewStatus: "accepted",
        hasProgress: true,
      }),
      true
    );
  });

  it("does not restore catalog access after un-release", () => {
    assert.equal(
      organizationMayOfferAssessment({
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        release: unreleasedAfterFirst,
        reviewStatus: "accepted",
      }),
      false
    );
    assert.equal(
      fatherCanStartAssessment({
        rows: [
          { group_id: "g1", assessment_key: KEYSTONE_ASSESSMENT_KEY, status: "available" },
        ],
        groupIds: ["g1"],
        homeGroupId: "g1",
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        release: unreleasedAfterFirst,
        reviewStatus: "accepted",
      }),
      false
    );
  });

  it("prefers the home group when a father is in more than one", () => {
    assert.equal(primaryFatherGroupId(["g2", "g1"], "g1"), "g1");
  });
});

describe("assessment catalog", () => {
  it("lists Keystone for every group, then custom assessments", () => {
    const items = buildManagerAssessmentCatalog({
      groups,
      custom: [custom],
      availability: [
        { group_id: "g2", assessment_key: KEYSTONE_ASSESSMENT_KEY, status: "hidden" },
      ],
      keystoneCompletedByGroup: { g1: 3, g2: 0 },
      groupSize: { g1: 4, g2: 2 },
    });
    const { available, hidden } = partitionAssessmentCatalog(items);

    assert.equal(items[0]?.kind, "keystone");
    assert.equal(items[0]?.questionCount, 128);
    assert.equal(items[0]?.completedCount, 3);
    assert.equal(available.some((item) => item.kind === "keystone" && item.groupId === "g1"), true);
    assert.equal(hidden.some((item) => item.kind === "keystone" && item.groupId === "g2"), true);
    assert.equal(
      available.filter((item) => item.kind === "custom").length,
      2
    );
  });

  it("puts a released Keystone in Waiting on you until the Leader accepts", () => {
    const items = buildManagerAssessmentCatalog({
      groups: [groups[0]!],
      custom: [],
      availability: [],
      keystoneCompletedByGroup: {},
      groupSize: { g1: 4 },
      keystoneRelease: released,
      reviews: [
        {
          group_id: "g1",
          assessment_key: KEYSTONE_ASSESSMENT_KEY,
          status: "pending",
          decline_reason: null,
          decided_by: null,
          decided_at: null,
          created_at: "2026-08-18T12:00:00Z",
        },
      ],
    });
    const { pending, available, hidden } = partitionAssessmentCatalog(items);
    assert.equal(pending.length, 1);
    assert.equal(available.length, 0);
    assert.equal(hidden.length, 0);
    assert.match(pending[0]?.href ?? "", /assessment-reviews/);
  });

  it("treats an accepted Keystone as hidden until the Leader shares it", () => {
    assert.equal(
      catalogVisibility({
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        groupId: "g1",
        availability: [],
        reviewStatus: "accepted",
      }),
      "hidden"
    );
    const items = buildManagerAssessmentCatalog({
      groups: [groups[0]!],
      custom: [],
      availability: [],
      keystoneCompletedByGroup: {},
      groupSize: { g1: 4 },
      keystoneRelease: released,
      reviews: [
        {
          group_id: "g1",
          assessment_key: KEYSTONE_ASSESSMENT_KEY,
          status: "accepted",
          decline_reason: null,
          decided_by: "m1",
          decided_at: "2026-08-18T13:00:00Z",
          created_at: "2026-08-18T12:00:00Z",
        },
      ],
    });
    const { available, hidden } = partitionAssessmentCatalog(items);
    assert.equal(available.length, 0);
    assert.equal(hidden.length, 1);
  });

  it("hides a first-party instrument until Super-admin releases it", () => {
    const items = buildManagerAssessmentCatalog({
      groups: [groups[0]!],
      custom: [],
      availability: [],
      keystoneCompletedByGroup: {},
      groupSize: { g1: 4 },
      firstParty: [
        {
          key: "legacy-architect",
          slug: "legacy-architect",
          title: "The Legacy Architect Keystone Assessment",
          description: "Test",
          questionCount: 30,
          instrument: {
            version: "1.0.0",
            items: [],
            scoring: {
              method: "sum_coded",
              scale: { min: 1, max: 4 },
              dimensions: [{ id: "legacy", label: "Legacy" }],
              outcome: { kind: "bands", dimension: "legacy", score: "raw", bands: [] },
            },
          },
          copy: {
            introduction: "",
            purpose: "",
            goal: "",
            honestHint: "",
          },
        },
      ],
      firstPartyReleases: {},
    });
    assert.equal(
      items.some((item) => item.assessmentKey === "legacy-architect"),
      false
    );
  });
});

describe("leader assessment access", () => {
  it("lets a Leader start Keystone when any managed group can offer it", () => {
    assert.equal(
      leaderCanStartAssessment({
        rows: [
          { group_id: "g1", assessment_key: KEYSTONE_ASSESSMENT_KEY, status: "hidden" },
          { group_id: "g2", assessment_key: KEYSTONE_ASSESSMENT_KEY, status: "available" },
        ],
        groupIds: ["g1", "g2"],
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        release: released,
        reviewStatusForGroup: (groupId) => (groupId === "g2" ? "accepted" : "declined"),
      }),
      true
    );
  });

  it("keeps Keystone available to the Leader when they already have progress", () => {
    assert.equal(
      leaderCanStartAssessment({
        rows: [
          { group_id: "g1", assessment_key: KEYSTONE_ASSESSMENT_KEY, status: "hidden" },
        ],
        groupIds: ["g1"],
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        hasProgress: true,
        release: released,
        reviewStatusForGroup: () => "declined",
      }),
      true
    );
  });
});
