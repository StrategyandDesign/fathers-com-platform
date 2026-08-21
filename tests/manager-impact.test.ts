import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Training } from "../lib/father/types";
import {
  buildManagerImpactSnapshot,
  includedImpactTrainings,
} from "../lib/manager/impact";
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

describe("impact snapshot trainings", () => {
  const comingHome = training({
    id: "coming-home",
    title: "Coming Home Present",
    order_index: 1,
  });
  const steady = training({
    id: "steady",
    title: "Steady Under Pressure",
    order_index: 2,
    released_at: null,
    first_released_at: null,
  });
  const flourishing = training({
    id: "flourishing",
    title: "Flourishing Faith",
    order_index: 3,
  });
  const testOne = training({
    id: "test-1",
    title: "Test Training 1",
    order_index: 4,
  });

  it("keeps only trainings the organization included", () => {
    const listed = includedImpactTrainings({
      trainings: [comingHome, steady, flourishing, testOne],
      groups: [{ id: "nwa" }],
      reviews: [
        { group_id: "nwa", training_id: "coming-home", status: "accepted" },
        { group_id: "nwa", training_id: "flourishing", status: "pending" },
        { group_id: "nwa", training_id: "test-1", status: "declined" },
      ],
    });
    assert.deepEqual(
      listed.map((row) => row.title),
      ["Coming Home Present", "Steady Under Pressure"]
    );
  });

  it("omits other catalog trainings from By training and scoped counts", () => {
    const snapshot = buildManagerImpactSnapshot({
      groups: [{ id: "nwa", name: "Returning Home NWA" }],
      trainings: [comingHome, flourishing, testOne],
      reviews: [
        { group_id: "nwa", training_id: "coming-home", status: "accepted" },
      ],
      sessions: [
        { id: "ch-1", training_id: "coming-home" },
        { id: "ff-1", training_id: "flourishing" },
      ],
      participants: [
        {
          fatherId: "james",
          lastActivity: "2026-08-20T00:00:00.000Z",
          joinedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      progress: [
        {
          id: "p1",
          father_id: "james",
          session_id: "ch-1",
          film_completed: true,
          checkin_completed: true,
          action_completed: true,
          checkin_answers: {},
          action_note: null,
          session_note: null,
          film_seconds: 0,
          status: "completed",
          completed_at: "2026-08-10T00:00:00.000Z",
        },
        {
          id: "p2",
          father_id: "james",
          session_id: "ff-1",
          film_completed: true,
          checkin_completed: true,
          action_completed: true,
          checkin_answers: {},
          action_note: null,
          session_note: null,
          film_seconds: 0,
          status: "completed",
          completed_at: "2026-08-11T00:00:00.000Z",
        },
      ],
      certificates: [
        { training_id: "coming-home", issued_at: "2026-08-12T00:00:00.000Z" },
        { training_id: "flourishing", issued_at: "2026-08-13T00:00:00.000Z" },
      ],
      trainingProgressFor: () => [
        card(comingHome, true, 6),
        card(flourishing, true, 6),
      ],
      now: new Date("2026-08-21T00:00:00.000Z"),
    });

    assert.deepEqual(
      snapshot.trainings.map((row) => row.title),
      ["Coming Home Present"]
    );
    assert.equal(snapshot.certificatesIssued, 1);
    assert.equal(snapshot.trend.sessionsCompleted.current, 1);
    assert.equal(snapshot.trend.certificatesIssued.current, 1);
    assert.equal(snapshot.fullyCompleted, 1);
  });
});
