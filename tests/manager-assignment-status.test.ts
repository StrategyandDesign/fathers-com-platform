import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import type { Training } from "../lib/father/types";
import {
  assignmentCellStatus,
  buildAssignmentBoard,
  listAssignableTrainings,
  summarizeAssignmentStatus,
} from "../lib/manager/assignment-status";
import type { TrainingProgress } from "../lib/manager/types";

function training(
  overrides: Partial<Training> & Pick<Training, "id" | "title">
): Training {
  return {
    slug: overrides.slug ?? overrides.id,
    description: null,
    session_count: 6,
    order_index: 10,
    published: true,
    first_published_at: "2026-01-01T00:00:00.000Z",
    released_at: "2026-08-01T00:00:00.000Z",
    first_released_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function card(
  row: Training,
  assigned: boolean,
  completed: number,
  total = 6
): TrainingProgress {
  return {
    training: row,
    sessions: [],
    completed,
    total,
    assigned,
    gated: false,
    certificate: null,
    current: null,
  };
}

describe("assignment cell status", () => {
  it("keeps unassigned distinct from assigned and not started", () => {
    assert.equal(assignmentCellStatus(null), "unassigned");
    assert.equal(assignmentCellStatus({ assigned: false, completed: 2, total: 6 }), "unassigned");
    assert.equal(assignmentCellStatus({ assigned: true, completed: 0, total: 6 }), "not_started");
    assert.equal(assignmentCellStatus({ assigned: true, completed: 2, total: 6 }), "in_progress");
    assert.equal(assignmentCellStatus({ assigned: true, completed: 6, total: 6 }), "completed");
  });
});

describe("assignable catalog for a manager", () => {
  const fundamentals = training({
    id: "fundamentals",
    title: "Fathering Fundamentals",
    order_index: 1,
  });
  const hidden = training({
    id: "hidden",
    title: "Hidden",
    order_index: 2,
  });

  it("only lists trainings accepted for a group the manager owns", () => {
    const listed = listAssignableTrainings({
      trainings: [fundamentals, hidden],
      groups: [{ id: "nwa" }],
      reviews: [
        { group_id: "nwa", training_id: "fundamentals", status: "accepted" },
        { group_id: "nwa", training_id: "hidden", status: "pending" },
        { group_id: "other-org", training_id: "hidden", status: "accepted" },
      ],
    });

    assert.deepEqual(
      listed.map((row) => row.id),
      ["fundamentals"]
    );
  });
});

describe("cohort status and board", () => {
  const fundamentals = training({
    id: "fundamentals",
    title: "Fathering Fundamentals",
    order_index: 1,
  });
  const present = training({
    id: "present",
    title: "Coming Home Present",
    order_index: 2,
  });
  const participants = [
    { fatherId: "joe", name: "Joe", groupId: "nwa", groupName: "NWA" },
    { fatherId: "sam", name: "Sam", groupId: "nwa", groupName: "NWA" },
  ];
  const reviews = [
    { group_id: "nwa", training_id: "fundamentals", status: "accepted" as const },
    { group_id: "nwa", training_id: "present", status: "accepted" as const },
  ];
  const progress: Record<string, TrainingProgress[]> = {
    joe: [card(fundamentals, true, 2), card(present, false, 0)],
    sam: [card(fundamentals, false, 0), card(present, true, 6)],
  };

  it("counts remaining only among men who can receive that training", () => {
    const summary = summarizeAssignmentStatus({
      training: fundamentals,
      participants,
      reviews,
      progressFor: (id) => progress[id] ?? [],
    });

    assert.equal(summary.total, 2);
    assert.equal(summary.assigned, 1);
    assert.equal(summary.remaining, 1);
    assert.equal(summary.inProgress, 1);
    assert.equal(summary.completed, 0);
  });

  it("builds a name by training board with one-click assign cells", () => {
    const board = buildAssignmentBoard({
      trainings: [present, fundamentals],
      participants,
      reviews,
      groups: [{ id: "nwa" }],
      progressFor: (id) => progress[id] ?? [],
    });

    assert.deepEqual(
      board.columns.map((column) => column.trainingId),
      ["fundamentals", "present"]
    );
    assert.equal(board.columns[0]?.remaining, 1);
    assert.equal(board.columns[1]?.remaining, 1);
    assert.equal(board.rows[0]?.cells[0]?.status, "in_progress");
    assert.equal(board.rows[0]?.cells[0]?.canAssign, false);
    assert.equal(board.rows[0]?.cells[1]?.canAssign, true);
    assert.equal(board.rows[1]?.cells[1]?.status, "completed");
  });

  it("ignores men who cannot receive the training when counting remaining", () => {
    const other = { fatherId: "ray", name: "Ray", groupId: "other", groupName: "Other" };
    const summary = summarizeAssignmentStatus({
      training: fundamentals,
      participants: [...participants, other],
      reviews,
      progressFor: (id) => progress[id] ?? [],
    });

    assert.equal(summary.total, 2);
    assert.equal(summary.remaining, 1);
  });

  it("does not offer assign for a training another organization accepted", () => {
    const board = buildAssignmentBoard({
      trainings: [fundamentals],
      participants,
      reviews: [{ group_id: "other-org", training_id: "fundamentals", status: "accepted" }],
      groups: [{ id: "nwa" }],
      progressFor: (id) => progress[id] ?? [],
    });

    assert.equal(board.columns.length, 0);
    assert.equal(board.rows[0]?.cells.length, 0);
  });
});

describe("leader dashboard order", () => {
  it("puts counts, invite code, and open items first", () => {
    const page = readFileSync(
      fileURLToPath(new URL("../app/(manager)/manager/page.tsx", import.meta.url)),
      "utf8"
    );
    const stats = page.indexOf("lg:grid-cols-5");
    const invite = page.indexOf("manager.dashboard.inviteTitle");
    const openItems = page.indexOf("manager.dashboard.attention");
    const staff = page.indexOf("<StaffDesk");
    const tape = page.indexOf("<ActivityTicker");
    const update = page.indexOf("<CohortNoteDesk");
    assert.ok(stats > 0 && invite > stats && openItems > invite);
    assert.ok(staff > openItems && tape > staff && update > tape);
  });
});

describe("hidden assignment surfaces", () => {
  it("does not render the assignment status strip on Home", () => {
    const page = readFileSync(
      fileURLToPath(new URL("../app/(manager)/manager/page.tsx", import.meta.url)),
      "utf8"
    );
    assert.doesNotMatch(page, /AssignmentStatusStrip/);
    assert.doesNotMatch(page, /assignmentStatus/);
  });

  it("does not render the who-has-what board on Participants", () => {
    const page = readFileSync(
      fileURLToPath(new URL("../app/(manager)/manager/participants/page.tsx", import.meta.url)),
      "utf8"
    );
    assert.doesNotMatch(page, /AssignmentBoard/);
    assert.doesNotMatch(page, /buildAssignmentBoard/);
  });

  it("keeps everyone-has-this out of the cohort action row", () => {
    const page = readFileSync(
      fileURLToPath(new URL("../app/(manager)/manager/trainings/page.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(page, /manager\.trainings\.viewTraining/);
    assert.match(page, /manager\.trainings\.chooseFathers/);
    assert.match(page, /assignTrainingToUnassigned/);
    assert.doesNotMatch(page, /manager\.trainings\.allAssigned/);
  });

  it("renders each cohort training as its own card", () => {
    const page = readFileSync(
      fileURLToPath(new URL("../app/(manager)/manager/trainings/page.tsx", import.meta.url)),
      "utf8"
    );
    const cohort = page.slice(page.indexOf('id="cohort"'));
    const list = cohort.slice(
      cohort.indexOf("<ul"),
      cohort.indexOf("</ul>") + 5
    );
    assert.match(list, /space-y-4/);
    assert.match(list, /rounded-xl border border-border bg-card p-4 sm:p-6/);
    assert.doesNotMatch(list, /divide-y/);
  });
});
