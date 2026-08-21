import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  assessmentCatalogDecision,
  buildManagerAssessmentCatalog,
} from "../lib/assessments/catalog";
import { KEYSTONE_ASSESSMENT_KEY } from "../lib/assessments/availability";
import type { PlatformAssessmentRelease } from "../lib/assessments/reviews";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

const released: PlatformAssessmentRelease = {
  assessment_key: KEYSTONE_ASSESSMENT_KEY,
  released_at: "2026-08-18T12:00:00Z",
  first_released_at: "2026-08-18T12:00:00Z",
  released_by: "admin-1",
};

describe("assessment catalog decisions", () => {
  it("keeps include, decline, and view assessment on one row", () => {
    const catalog = readRepo("components/manager/assessment-catalog.tsx");
    const page = readRepo("app/(manager)/manager/assessments/page.tsx");
    const buttons = readRepo("components/manager/assessment-catalog-decision-buttons.tsx");

    assert.match(catalog, /flex flex-row flex-wrap items-center gap-2/);
    assert.match(catalog, /AssessmentCatalogDecisionButtons/);
    assert.match(catalog, /manager\.assessments\.viewAssessment/);
    assert.match(catalog, /manager\.assessments\.catalogTitle/);
    assert.match(page, /<AssessmentCatalog/);
    assert.doesNotMatch(page, /AssessmentVisibilityForms|AssessmentReviewForms/);
    assert.match(buttons, /manager\.assessments\.included/);
    assert.match(buttons, /manager\.assessments\.declined/);
    assert.match(buttons, /manager\.assessments\.include/);
    assert.match(buttons, /manager\.assessments\.decline/);
    assert.match(buttons, /disabled:opacity-100/);
    assert.match(buttons, /bg-destructive text-white/);
    assert.match(buttons, /name="quick"/);
  });

  it("maps review state the same way trainings map Include and Declined", () => {
    assert.equal(
      assessmentCatalogDecision({
        kind: "keystone",
        section: "pending",
        reviewStatus: "pending",
      }),
      "pending"
    );
    assert.equal(
      assessmentCatalogDecision({
        kind: "platform",
        section: "hidden",
        reviewStatus: "accepted",
      }),
      "ready"
    );
    assert.equal(
      assessmentCatalogDecision({
        kind: "keystone",
        section: "declined",
        reviewStatus: "declined",
      }),
      "declined"
    );
    assert.equal(
      assessmentCatalogDecision({
        kind: "custom",
        section: "hidden",
        reviewStatus: null,
        status: "hidden",
      }),
      "pending"
    );
  });

  it("marks a released Keystone as pending until the Leader includes it", () => {
    const items = buildManagerAssessmentCatalog({
      groups: [{ id: "g1", name: "Returning Home NWA" }],
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
    assert.equal(items[0]?.decision, "pending");
  });
});
