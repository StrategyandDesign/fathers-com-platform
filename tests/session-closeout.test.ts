import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSessionCloseout,
  closeoutRemaining,
  nextSessionAfter,
} from "../lib/father/session-closeout";
import type { Session, SessionProgress } from "../lib/father/types";

function session(id: string, number: number, title = `Session ${number}`): Session {
  return {
    id,
    training_id: "t1",
    session_number: number,
    title,
    keyline: null,
    video_url: null,
    order_index: number,
  };
}

function done(): SessionProgress {
  return {
    id: "p",
    father_id: "f1",
    session_id: "s",
    film_completed: true,
    checkin_completed: true,
    action_completed: true,
    checkin_answers: {},
    action_note: null,
    status: "completed",
    completed_at: "2026-08-18T12:00:00Z",
    session_note: null,
    film_seconds: 0,
    action_try_at: null,
  };
}

describe("session closeout", () => {
  const sessions = [session("s1", 1), session("s2", 2), session("s3", 3), session("s4", 4)];

  it("counts what remains after this session is in", () => {
    assert.equal(closeoutRemaining(5, 9), 4);
    assert.equal(closeoutRemaining(9, 9), 0);
    assert.equal(closeoutRemaining(0, 9), 9);
  });

  it("names the next session after the one just closed", () => {
    assert.equal(nextSessionAfter(sessions, "s2", ["s1", "s2"])?.id, "s3");
    assert.equal(nextSessionAfter(sessions, "s4", ["s1", "s2", "s3", "s4"]), null);
  });

  it("builds a map of behind, here, and ahead", () => {
    const progress = new Map<string, SessionProgress | null>([
      ["s1", done()],
      ["s2", done()],
    ]);
    const closeout = buildSessionCloseout({
      finished: sessions[1],
      sessions,
      progressBySession: progress,
      total: 4,
    });

    assert.equal(closeout.completed, 2);
    assert.equal(closeout.remaining, 2);
    assert.equal(closeout.trainingComplete, false);
    assert.equal(closeout.next?.id, "s3");
    assert.equal(closeout.nextHref, "/father/sessions/s3");
    assert.deepEqual(
      closeout.marks.map((mark) => [mark.number, mark.state, mark.href]),
      [
        [1, "done", "/father/sessions/s1"],
        [2, "current", "/father/sessions/s2"],
        [3, "next", "/father/sessions/s3"],
        [4, "locked", null],
      ]
    );
  });

  it("marks the training complete when nothing remains", () => {
    const progress = new Map(sessions.map((row) => [row.id, done()] as const));
    const closeout = buildSessionCloseout({
      finished: sessions[3],
      sessions,
      progressBySession: progress,
      total: 4,
    });

    assert.equal(closeout.remaining, 0);
    assert.equal(closeout.trainingComplete, true);
    assert.equal(closeout.next, null);
    assert.equal(closeout.marks.at(-1)?.state, "current");
  });
});
