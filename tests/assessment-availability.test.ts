import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  KEYSTONE_ASSESSMENT_KEY,
  fatherCanStartAssessment,
  isAssessmentAvailable,
  primaryFatherGroupId,
} from "../lib/assessments/availability";
import {
  buildManagerAssessmentCatalog,
  partitionAssessmentCatalog,
} from "../lib/assessments/catalog";
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
});
