import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pickChannel } from "../lib/notifications/channel";
import { actionSummaryFromCatalog, notificationCopy, safePayload } from "../lib/notifications/copy";
import { isFatherDeepLink, normalizeDeepLink, sessionActionHref, sessionFilmHref } from "../lib/notifications/links";
import { weeklySessionTarget } from "../lib/notifications/next-session";
import {
  isInQuietHours,
  isWeeklyDue,
  isoWeekKey,
  lastWeeklyOccurrence,
  nextQuietEnd,
  pickWithinCeiling,
  weeklyDedupeKey,
  weeklySlotKey,
} from "../lib/notifications/schedule";
import type { Session, SessionProgress, Training } from "../lib/father/types";

function training(id: string, extra: Partial<Training> = {}): Training {
  return {
    id,
    slug: id,
    title: "Fathering Fundamentals",
    description: null,
    session_count: 2,
    order_index: 1,
    ...extra,
  };
}

function session(id: string, trainingId: string, number: number): Session {
  return {
    id,
    training_id: trainingId,
    session_number: number,
    title: `Session ${number}`,
    keyline: "Practice one calm check-in tonight",
    video_url: null,
    order_index: number,
    duration_seconds: 240,
  };
}

function progress(sessionId: string, flags: Partial<SessionProgress> = {}): SessionProgress {
  return {
    id: `p-${sessionId}`,
    father_id: "father-1",
    session_id: sessionId,
    film_completed: false,
    checkin_completed: false,
    action_completed: false,
    checkin_answers: {},
    action_note: null,
    session_note: null,
    film_seconds: 0,
    status: "not_started",
    completed_at: null,
    ...flags,
  };
}

describe("frequency ceiling", () => {
  it("sends exactly 3 of 8 eligible events and puts encouragement first", () => {
    const events = [
      { type: "weekly_session" as const, id: 1 },
      { type: "action" as const, id: 2 },
      { type: "new_assignment" as const, id: 3 },
      { type: "certificate" as const, id: 4 },
      { type: "weekly_session" as const, id: 5 },
      { type: "action" as const, id: 6 },
      { type: "new_assignment" as const, id: 7 },
      { type: "leader_encouragement" as const, id: 8 },
    ];
    const picked = pickWithinCeiling(events, 0);
    assert.equal(picked.length, 3);
    assert.equal(picked[0]?.type, "leader_encouragement");
  });

  it("keeps the ceiling when some were already sent", () => {
    const picked = pickWithinCeiling(
      [
        { type: "weekly_session" as const },
        { type: "leader_encouragement" as const },
        { type: "certificate" as const },
      ],
      2
    );
    assert.equal(picked.length, 1);
    assert.equal(picked[0]?.type, "leader_encouragement");
  });

  it("lets a leader note through when the window is already full", () => {
    const picked = pickWithinCeiling(
      [{ type: "weekly_session" as const }, { type: "leader_encouragement" as const }],
      3
    );
    assert.equal(picked.length, 1);
    assert.equal(picked[0]?.type, "leader_encouragement");
  });
});

describe("quiet hours", () => {
  it("holds in a UTC+ timezone after 21:00 local", () => {
    // Asia/Jerusalem is UTC+3 in August. 19:00 UTC is 22:00 local.
    const at = new Date("2026-08-18T19:00:00Z");
    assert.equal(isInQuietHours(at, "Asia/Jerusalem"), true);
    assert.equal(isInQuietHours(new Date("2026-08-18T16:00:00Z"), "Asia/Jerusalem"), false);
  });

  it("uses the father's own quiet hours when he changes them", () => {
    const at = new Date("2026-08-18T16:00:00Z");
    assert.equal(isInQuietHours(at, "Asia/Jerusalem", "18:00", "08:00"), true);
  });

  it("moves a 22:30 local send to 07:00 local", () => {
    const next = nextQuietEnd(new Date("2026-08-18T19:30:00Z"), "Asia/Jerusalem");
    assert.equal(next.toISOString(), "2026-08-19T04:00:00.000Z");
  });
});

describe("weekly due window", () => {
  it("is due on Tuesday after 19:00 in the father's timezone", () => {
    // Tuesday 18 Aug 2026 19:00 in America/Chicago is 00:00 UTC Wednesday.
    const at = new Date("2026-08-19T00:05:00Z");
    assert.equal(
      isWeeklyDue({ at, timeZone: "America/Chicago", weekday: 2, remindAt: "19:00" }),
      true
    );
    assert.equal(
      isWeeklyDue({ at, timeZone: "America/Chicago", weekday: 3, remindAt: "19:00" }),
      false
    );
  });

  it("builds a stable week key for dedupe", () => {
    const key = isoWeekKey(new Date("2026-08-18T19:00:00Z"), "UTC");
    assert.match(key, /^\d{4}-W\d{2}$/);
    assert.equal(weeklyDedupeKey("u1", "s1", key), `weekly:u1:s1:${key}`);
  });

  it("stays due the next morning when the chosen time was in quiet hours", () => {
    // Tuesday 22:00 Asia/Jerusalem is in default quiet hours. Wednesday 07:05 is not.
    const morning = new Date("2026-08-19T04:05:00Z");
    assert.equal(
      isWeeklyDue({ at: morning, timeZone: "Asia/Jerusalem", weekday: 2, remindAt: "22:00" }),
      true
    );
    assert.equal(isInQuietHours(morning, "Asia/Jerusalem"), false);
    assert.equal(
      weeklySlotKey({ at: morning, timeZone: "Asia/Jerusalem", weekday: 2, remindAt: "22:00" }),
      "2026-08-18"
    );
    assert.ok(lastWeeklyOccurrence({ at: morning, timeZone: "Asia/Jerusalem", weekday: 2, remindAt: "22:00" }));
  });
});

describe("channel and copy", () => {
  it("uses push when available and email only as fallback", () => {
    assert.equal(
      pickChannel({ prefs: { pushEnabled: true, emailEnabled: true }, hasPushSubscription: true }),
      "push"
    );
    assert.equal(
      pickChannel({ prefs: { pushEnabled: true, emailEnabled: true }, hasPushSubscription: false }),
      "email"
    );
    assert.equal(
      pickChannel({ prefs: { pushEnabled: false, emailEnabled: false }, hasPushSubscription: true }),
      null
    );
  });

  it("uses catalog copy and never father writing", () => {
    const weekly = notificationCopy("weekly_session", {
      trainingTitle: "Fathering Fundamentals",
      minutes: 5,
    });
    assert.equal(weekly.title, "Your next session is ready");
    assert.equal(
      weekly.body,
      "Fathering Fundamentals. 5 min. This is your weekly reminder."
    );
    assert.equal(weekly.body.includes("!"), false);
    assert.equal(weekly.body.includes("—"), false);

    const action = notificationCopy("action", {
      actionSummary: actionSummaryFromCatalog({
        keyline: "Practice one calm check-in tonight",
        title: "Session 1",
      }),
    });
    assert.equal(action.title, "One thing to try");
    assert.match(action.body, /Practice one calm check-in tonight/);

    const leaked = safePayload({
      trainingTitle: "Fathering Fundamentals",
      actionSummary: "I yelled at my kid",
      notes: "skip me",
      outcome_note: "Named the bedtime check-in",
    });
    assert.equal(leaked.actionSummary, "this week's practice");
    assert.equal("notes" in leaked, false);
    assert.equal("outcome_note" in leaked, false);
  });
});

describe("deep links and next session", () => {
  it("lands on the film, action, or certificate", () => {
    assert.equal(sessionFilmHref("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), "/father/sessions/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    assert.equal(sessionActionHref("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), "/father/sessions/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/action");
    assert.equal(normalizeDeepLink("/father"), "/father");
    assert.equal(isFatherDeepLink("/father/certificates"), true);
    assert.equal(isFatherDeepLink("/father"), true);
  });

  it("only reminds for an assigned open session that has not started", () => {
    const part1 = training("t1");
    const next = weeklySessionTarget({
      assigned: [{ training: part1, assignedAt: 1 }],
      allTrainings: [part1],
      sessions: [session("s1", "t1", 1), session("s2", "t1", 2)],
      progress: [],
    });
    assert.equal(next?.session.id, "s1");

    const started = weeklySessionTarget({
      assigned: [{ training: part1, assignedAt: 1 }],
      allTrainings: [part1],
      sessions: [session("s1", "t1", 1)],
      progress: [progress("s1", { film_completed: true })],
    });
    assert.equal(started, null);
  });
});
