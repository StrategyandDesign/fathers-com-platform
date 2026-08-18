import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Session, SessionProgress, Training } from "../lib/father/types";
import {
  MAX_TRAINING_SESSIONS,
  gatedPartLabel,
  isLaterSeriesPart,
  isSeriesPartGated,
  isTrainingPartComplete,
  sessionCountWouldExceedLimit,
  trainingCoverSlug,
  trainingPartCopyVars,
  trainingPartSubtitle,
} from "../lib/trainings/series";

function training(overrides: Partial<Training> & Pick<Training, "id">): Training {
  return {
    slug: "fundamentals",
    title: "Fathering Fundamentals: Part 1",
    description: null,
    session_count: 5,
    order_index: 10,
    series_id: "series-1",
    series_title: "Fathering Fundamentals",
    part_number: 1,
    part_total: 2,
    ...overrides,
  };
}

function session(
  overrides: Partial<Session> & Pick<Session, "id" | "training_id" | "session_number">
): Session {
  return {
    title: "Session",
    keyline: null,
    video_url: null,
    order_index: overrides.session_number,
    ...overrides,
  };
}

function progress(
  sessionId: string,
  done: boolean
): SessionProgress {
  return {
    id: `p-${sessionId}`,
    father_id: "father-1",
    session_id: sessionId,
    film_completed: done,
    checkin_completed: done,
    action_completed: done,
    checkin_answers: {},
    action_note: null,
    session_note: null,
    film_seconds: 0,
    status: done ? "completed" : "not_started",
    completed_at: done ? "2026-08-01T00:00:00Z" : null,
  };
}

describe("training series helpers", () => {
  it("treats a null series_id as standalone", () => {
    const standalone = training({
      id: "faith",
      slug: "flourishingfaith",
      title: "Flourishing Faith",
      series_id: null,
      series_title: null,
      part_number: null,
      part_total: null,
    });
    assert.equal(isLaterSeriesPart(standalone), false);
    assert.equal(trainingCoverSlug(standalone), "flourishingfaith");
    assert.equal(trainingPartSubtitle(standalone, 0), null);
  });

  it("formats the father-facing part subtitle", () => {
    const part1 = training({ id: "ff-1" });
    assert.equal(trainingPartSubtitle(part1, 5), "Part 1 of 2. 5 sessions.");
    assert.equal(trainingPartSubtitle(part1, 1), "Part 1 of 2. 1 session.");
    assert.deepEqual(trainingPartCopyVars(part1, 5), {
      n: 1,
      total: 2,
      sessions: 5,
      one: false,
    });
  });

  it("uses the series root slug for later-part covers", () => {
    const part2 = training({
      id: "reentry-2",
      slug: "reentry-2",
      title: "Coming Home Present: Part 2",
      part_number: 2,
    });
    assert.equal(trainingCoverSlug(part2), "reentry");
    assert.equal(gatedPartLabel(part2), 1);
  });

  it("gates a later part until earlier parts are complete", () => {
    const part1 = training({ id: "ff-1", part_number: 1 });
    const part2 = training({
      id: "ff-2",
      slug: "fundamentals-2",
      title: "Fathering Fundamentals: Part 2",
      part_number: 2,
      session_count: 4,
    });
    const sessions = [
      session({ id: "s1", training_id: "ff-1", session_number: 1 }),
      session({ id: "s2", training_id: "ff-1", session_number: 2 }),
      session({ id: "s3", training_id: "ff-2", session_number: 1 }),
    ];
    const incomplete = new Map<string, SessionProgress>([
      ["s1", progress("s1", true)],
    ]);
    assert.equal(isTrainingPartComplete("ff-1", sessions, incomplete), false);
    assert.equal(isSeriesPartGated(part2, [part1, part2], sessions, incomplete), true);

    const complete = new Map<string, SessionProgress>([
      ["s1", progress("s1", true)],
      ["s2", progress("s2", true)],
    ]);
    assert.equal(isTrainingPartComplete("ff-1", sessions, complete), true);
    assert.equal(isSeriesPartGated(part2, [part1, part2], sessions, complete), false);
    assert.equal(isSeriesPartGated(part1, [part1, part2], sessions, complete), false);
  });

  it("enforces the 6-session maximum", () => {
    assert.equal(MAX_TRAINING_SESSIONS, 6);
    assert.equal(sessionCountWouldExceedLimit(6), true);
    assert.equal(sessionCountWouldExceedLimit(5), false);
    assert.equal(sessionCountWouldExceedLimit(6, 0), false);
  });
});
