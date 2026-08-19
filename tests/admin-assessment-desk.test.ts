import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assessmentDeskNote,
  assessmentDevelopmentStatus,
  assessmentEditedAt,
  assessmentEditedLabel,
  assessmentReleaseState,
  keystoneDeskItem,
  sourcedAssessmentDeskItem,
} from "../lib/admin/assessment-desk";
import { KEYSTONE_ASSESSMENT_KEY } from "../lib/assessments/availability";

describe("admin assessment desk", () => {
  it("treats an unreleased Keystone as ready for review and in the catalog", () => {
    const item = keystoneDeskItem({
      assessmentKey: KEYSTONE_ASSESSMENT_KEY,
      releasedAt: null,
      firstReleasedAt: null,
      releaseTargets: [],
    });

    assert.equal(item.developmentStatus, "ready_for_review");
    assert.equal(item.releaseState, "catalog");
    assert.equal(item.questionCount, 128);
    assert.equal(item.kindLabel, "Platform assessment");
    assert.equal(item.actionLabel, "Release");
    assert.equal(item.archived, false);
    assert.equal(item.editedAt, null);
    assert.equal(
      assessmentEditedLabel({ releasedAt: null, firstReleasedAt: null }),
      "Edited —"
    );
  });

  it("uses the same edited stamp as the Trainings list after release", () => {
    const item = keystoneDeskItem({
      assessmentKey: KEYSTONE_ASSESSMENT_KEY,
      releasedAt: "2026-08-18T12:00:00Z",
      firstReleasedAt: "2026-08-01T12:00:00Z",
      releaseTargets: [
        { reviewStatus: "accepted" },
        { reviewStatus: "pending" },
        { reviewStatus: "declined" },
        { reviewStatus: null },
      ],
    });

    assert.equal(item.developmentStatus, "released");
    assert.equal(item.releaseState, "released");
    assert.equal(item.editedAt, "2026-08-18T12:00:00Z");
    assert.match(
      assessmentEditedLabel({
        releasedAt: "2026-08-18T12:00:00Z",
        firstReleasedAt: "2026-08-01T12:00:00Z",
      }),
      /^Edited /
    );
    assert.equal(item.archived, false);
  });

  it("marks an un-released instrument ready, not back in the open catalog", () => {
    assert.equal(
      assessmentReleaseState({ releasedAt: null, firstReleasedAt: "2026-08-01T12:00:00Z" }),
      "ready"
    );
    assert.equal(assessmentDevelopmentStatus({ releasedAt: null }), "ready_for_review");
    assert.equal(
      assessmentDeskNote({
        releasedAt: null,
        firstReleasedAt: "2026-08-01T12:00:00Z",
        accepted: 2,
        pending: 0,
      }),
      "Un-released. Leaders cannot accept it again until you release it."
    );
    assert.equal(
      assessmentEditedAt({
        releasedAt: null,
        firstReleasedAt: "2026-08-01T12:00:00Z",
      }),
      "2026-08-01T12:00:00Z"
    );
  });

  it("lists a brought-in instrument on the same desk as Keystone", () => {
    const item = sourcedAssessmentDeskItem({
      id: "p1",
      assessmentKey: "presence-scale",
      title: "Presence Scale",
      description: null,
      attribution: "Dr. Rivera",
      instrument: {
        version: "1.0.0",
        items: [
          { id: "a", prompt: "I stay nearby", dimension: "presence", coding: 1 },
        ],
        scoring: {
          method: "sum_coded",
          scale: { min: 1, max: 5 },
          dimensions: [{ id: "presence", label: "Presence" }],
          outcome: { kind: "highest_dimension", labels: { presence: "Present" } },
        },
      },
      developmentStatus: "draft",
      archived: false,
      lastEditedAt: "2026-08-19T12:00:00Z",
      intakeId: "intake-1",
    });
    assert.equal(item.questionCount, 1);
    assert.equal(item.kindLabel, "From Dr. Rivera");
    assert.equal(item.actionLabel, "Desk");
    assert.equal(item.href, "/admin/assessments/intakes/intake-1");
  });
});
