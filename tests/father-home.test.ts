import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  homeTrainingSessionCount,
  pickHomeAssessment,
  sortHomePath,
  splitHomeRows,
} from "../lib/father/home";
import { fatherWeekStreak } from "../lib/father/streak";
import type { FatherAssignmentCard } from "../lib/assessments/types";

function assignment(
  status: FatherAssignmentCard["assignment"]["status"],
  questionCount = 4
): FatherAssignmentCard {
  return {
    assignment: {
      id: status,
      assessment_id: "a1",
      father_id: "f1",
      assigned_by: null,
      status,
      started_at: null,
      completed_at: null,
      created_at: "2026-08-18T00:00:00Z",
    },
    assessment: {
      id: "a1",
      manager_id: "m1",
      title: "Skill check",
      description: null,
      created_at: "2026-08-18T00:00:00Z",
      updated_at: "2026-08-18T00:00:00Z",
    },
    questionCount,
    answeredCount: 0,
  };
}

describe("father week streak", () => {
  it("is zero with no completed sessions", () => {
    assert.equal(fatherWeekStreak({ completedAt: [], now: new Date("2026-08-18T15:00:00Z") }).weeks, 0);
  });

  it("counts one week for one completed session", () => {
    const streak = fatherWeekStreak({
      completedAt: ["2026-08-18T15:00:00Z"],
      timeZone: "UTC",
      now: new Date("2026-08-18T16:00:00Z"),
    });
    assert.equal(streak.weeks, 1);
  });

  it("counts consecutive weeks and ignores extra sessions in the same week", () => {
    const streak = fatherWeekStreak({
      completedAt: [
        "2026-08-18T15:00:00Z",
        "2026-08-16T12:00:00Z",
        "2026-08-11T12:00:00Z",
      ],
      timeZone: "UTC",
      now: new Date("2026-08-18T16:00:00Z"),
    });
    assert.equal(streak.weeks, 2);
  });

  it("keeps last week while the current week is still open", () => {
    const streak = fatherWeekStreak({
      completedAt: ["2026-08-11T12:00:00Z"],
      timeZone: "UTC",
      now: new Date("2026-08-18T16:00:00Z"),
    });
    assert.equal(streak.weeks, 1);
  });

  it("resets after a missed week", () => {
    const streak = fatherWeekStreak({
      completedAt: ["2026-08-02T12:00:00Z"],
      timeZone: "UTC",
      now: new Date("2026-08-18T16:00:00Z"),
    });
    assert.equal(streak.weeks, 0);
  });

  it("assigns the week in the father's timezone", () => {
    const at = new Date("2026-08-17T04:00:00Z");
    const chicago = fatherWeekStreak({
      completedAt: [at],
      timeZone: "America/Chicago",
      now: new Date("2026-08-18T15:00:00Z"),
    });
    const jerusalem = fatherWeekStreak({
      completedAt: [at],
      timeZone: "Asia/Jerusalem",
      now: new Date("2026-08-18T15:00:00Z"),
    });
    assert.equal(chicago.weeks, 1);
    assert.equal(jerusalem.weeks, 1);
    assert.notEqual(chicago.weekKeys[0], jerusalem.weekKeys[0]);
  });
});

describe("home path order", () => {
  it("puts the current training first, then open, completed, and gated", () => {
    const cards = sortHomePath(
      [
        { training: { id: "gated" }, completed: 0, total: 6, gated: true },
        { training: { id: "done" }, completed: 5, total: 5, gated: false },
        { training: { id: "open" }, completed: 1, total: 5, gated: false },
        { training: { id: "now" }, completed: 2, total: 5, gated: false },
      ],
      "now"
    );
    assert.deepEqual(
      cards.map((card) => card.training.id),
      ["now", "open", "done", "gated"]
    );
  });
});

describe("home training session count", () => {
  it("returns the session total for a card with sessions", () => {
    assert.equal(homeTrainingSessionCount(8), 8);
    assert.equal(homeTrainingSessionCount(1), 1);
    assert.equal(homeTrainingSessionCount(0), null);
  });
});

describe("home shelves", () => {
  it("puts open trainings on one Your Trainings shelf, current first", () => {
    const rows = splitHomeRows(
      [
        {
          training: { id: "fundamentals" },
          completed: 4,
          total: 9,
          gated: false,
          next: { id: "s4" },
          nextProgress: { status: "in_progress" },
        },
        {
          training: { id: "anger" },
          completed: 0,
          total: 12,
          gated: false,
          next: { id: "a1" },
          nextProgress: null,
        },
      ],
      "fundamentals"
    );
    assert.deepEqual(rows.path, []);
    assert.deepEqual(
      rows.trainings.map((card) => card.training.id),
      ["fundamentals", "anger"]
    );
    assert.deepEqual(rows.completed, []);
  });

  it("does not list a finished training as available", () => {
    const rows = splitHomeRows(
      [
        { training: { id: "fundamentals" }, completed: 9, total: 9, gated: false },
        { training: { id: "anger" }, completed: 0, total: 12, gated: false, next: { id: "a1" } },
      ],
      "fundamentals"
    );
    assert.deepEqual(
      rows.path.map((card) => card.training.id),
      []
    );
    assert.deepEqual(
      rows.completed.map((card) => card.training.id),
      ["fundamentals"]
    );
    assert.deepEqual(
      rows.trainings.map((card) => card.training.id),
      ["anger"]
    );
  });

  it("keeps finished trainings off Your Path", () => {
    const rows = splitHomeRows(
      [{ training: { id: "fundamentals" }, completed: 9, total: 9, gated: false }],
      null
    );
    assert.equal(rows.path.length, 0);
    assert.equal(rows.trainings.length, 0);
    assert.equal(rows.completed[0]?.training.id, "fundamentals");
  });
});

describe("home board layout", () => {
  it("puts completed trainings and certificates beside Your Path on desktop", () => {
    const path = readFileSync(
      fileURLToPath(new URL("../components/father/home-path.tsx", import.meta.url)),
      "utf8"
    );
    const page = readFileSync(
      fileURLToPath(new URL("../app/(father)/father/page.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(path, /lg:grid-cols-\[minmax\(0,1\.4fr\)_minmax\(16\.5rem,1fr\)\]/);
    assert.match(path, /rounded-xl border border-border/);
    assert.match(path, /divide-y divide-border/);
    assert.match(path, /lg:divide-x/);
    assert.match(path, /father\.home\.yourTrainings/);
    assert.match(path, /homeTrainingSessionCount/);
    assert.match(path, /father\.home\.trainingSessions/);
    assert.doesNotMatch(path, /father\.home\.yourPath/);
    assert.match(path, /HomeEarnedRow/);
    assert.match(page, /earned=\{earned\}/);
    assert.doesNotMatch(page, /<HomeEarnedRow/);
    const earned = readFileSync(
      fileURLToPath(new URL("../components/father/home-earned.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(earned, /certificatePreviewPath/);
    assert.match(earned, /CertificateFace/);
    assert.doesNotMatch(earned, /certificateDownloadPath/);
  });
});

describe("home assessment card", () => {
  it("hides when nothing is due and there is no result", () => {
    assert.equal(
      pickHomeAssessment({ assignments: [], profile: null, draft: null }),
      null
    );
  });

  it("prefers a due assignment over a result", () => {
    const picked = pickHomeAssessment({
      assignments: [assignment("completed"), assignment("in_progress")],
      profile: {
        id: "p1",
        taken_at: "2026-08-01T00:00:00Z",
        primary_edge: null,
        primary_determination: null,
      },
      draft: null,
    });
    assert.equal(picked?.kind, "custom");
    if (picked?.kind === "custom") {
      assert.equal(picked.card.assignment.status, "in_progress");
    }
  });
});
