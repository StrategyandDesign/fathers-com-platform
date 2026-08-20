import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { transactionalEmailAttrs } from "../lib/email/layout";
import { createTranslator } from "../lib/i18n/translate";
import {
  buildNudgePanel,
  canReachFather,
  completedSessionCount,
  lastCompletedSessionAt,
  leaderFirstName,
  nudgeMessage,
  nudgeTier,
  type NudgePanelFather,
} from "../lib/manager/nudge-panel";
import { notificationCopy, safePayload } from "../lib/notifications/copy";
import { nextQuietEnd, pickWithinCeiling } from "../lib/notifications/schedule";
import type { Session, SessionProgress, Training } from "../lib/father/types";
import type { TrainingAssignment, TrainingProgress } from "../lib/manager/types";

const t = createTranslator("en");
const now = new Date("2026-08-18T15:00:00.000Z");

function daysAgo(days: number) {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

function training(id = "t1"): Training {
  return {
    id,
    slug: id,
    title: "Fathering Fundamentals",
    description: null,
    session_count: 5,
    order_index: 1,
  };
}

function session(id: string, number: number, duration = 480): Session {
  return {
    id,
    training_id: "t1",
    session_number: number,
    title: `Session ${number}`,
    keyline: null,
    video_url: null,
    order_index: number,
    duration_seconds: duration,
  };
}

function progress(
  sessionId: string,
  flags: Partial<SessionProgress> = {}
): SessionProgress {
  return {
    id: `p-${sessionId}`,
    father_id: "f1",
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

function complete(sessionId: string, days: number): SessionProgress {
  return progress(sessionId, {
    father_id: "f1",
    film_completed: true,
    checkin_completed: true,
    action_completed: true,
    status: "completed",
    completed_at: daysAgo(days),
  });
}

function card(input: Partial<TrainingProgress> & { completed: number; total?: number }): TrainingProgress {
  const sessions = [session("s1", 1), session("s2", 2), session("s3", 3), session("s4", 4), session("s5", 5)];
  return {
    training: training(),
    sessions,
    completed: input.completed,
    total: input.total ?? 5,
    assigned: true,
    gated: false,
    certificate: null,
    current: {
      session: sessions[input.completed] ?? sessions[0]!,
      progress: null,
    },
    ...input,
  };
}

function assignment(fatherId: string, days: number): TrainingAssignment {
  return {
    id: `a-${fatherId}`,
    father_id: fatherId,
    training_id: "t1",
    assigned_by: null,
    assigned_at: daysAgo(days),
  };
}

function father(input: Partial<NudgePanelFather> & { fatherId: string; name: string }): NudgePanelFather {
  return {
    cards: [card({ completed: 0 })],
    progress: [],
    assignments: [assignment(input.fatherId, 12)],
    lastNudgeAt: null,
    reachability: {
      pushEnabled: false,
      emailEnabled: true,
      hasPush: false,
      leaderEncouragement: true,
      timezone: "UTC",
      quietHoursStart: "21:00",
      quietHoursEnd: "07:00",
    },
    ...input,
  };
}

const FORBIDDEN =
  /\b(rehab|recovery|treatment|therapy|service|deployment|unit|facility|behind|late|failing|streak|days?)\b/i;
const HEBREW_FORBIDDEN = /שיקום|טיפול|יחידה|מתקן|פריסה|יום|ימים/;

function assertSafeCopy(title: string, body: string) {
  assert.equal(title.includes("!"), false);
  assert.equal(body.includes("!"), false);
  assert.equal(title.includes("—"), false);
  assert.equal(body.includes("—"), false);
  assert.equal(FORBIDDEN.test(title), false);
  assert.equal(FORBIDDEN.test(body), false);
}

describe("stall definition", () => {
  it("uses the last completed session, not join or assignment time", () => {
    const rows = [
      complete("s1", 14),
      progress("s2", { film_completed: true, completed_at: daysAgo(1) }),
    ];
    assert.equal(lastCompletedSessionAt(rows), daysAgo(14));
    assert.equal(completedSessionCount(rows), 1);
  });

  it("classifies never started, stalled, and long quiet", () => {
    assert.equal(nudgeTier({ completedCount: 0, daysSinceLastSession: 12 }), "A");
    assert.equal(nudgeTier({ completedCount: 3, daysSinceLastSession: 14 }), "B");
    assert.equal(nudgeTier({ completedCount: 2, daysSinceLastSession: 41 }), "C");
    assert.equal(nudgeTier({ completedCount: 0, daysSinceLastSession: 41 }), "A");
    assert.equal(nudgeTier({ completedCount: 1, daysSinceLastSession: 9 }), null);
  });

  it("omits men who finished their assigned training or were nudged this week", () => {
    const panel = buildNudgePanel({
      role: "manager",
      leaderFirstName: "Maya",
      t,
      now,
      fathers: [
        father({
          fatherId: "done",
          name: "Done",
          cards: [card({ completed: 5, total: 5, current: null })],
          progress: [complete("s1", 20), complete("s2", 19), complete("s3", 18), complete("s4", 17), complete("s5", 16)],
        }),
        father({
          fatherId: "fresh",
          name: "Fresh",
          cards: [card({ completed: 1 })],
          progress: [complete("s1", 3)],
        }),
        father({
          fatherId: "nudged",
          name: "Nudged",
          lastNudgeAt: daysAgo(2),
          cards: [card({ completed: 1 })],
          progress: [complete("s1", 20)],
        }),
      ],
    });
    assert.equal(panel.rows.length, 0);
  });
});

describe("panel list", () => {
  it("sorts longest quiet first, caps at 10, and names the overflow", () => {
    const fathers = Array.from({ length: 16 }, (_, index) =>
      father({
        fatherId: `f${index}`,
        name: `Father ${String(index).padStart(2, "0")}`,
        assignments: [assignment(`f${index}`, 10 + index)],
        cards: [card({ completed: 0 })],
      })
    );
    const panel = buildNudgePanel({
      role: "manager",
      leaderFirstName: "Maya",
      t,
      now,
      fathers,
    });
    assert.equal(panel.rows.length, 10);
    assert.equal(panel.hiddenCount, 6);
    assert.equal(panel.rows[0]?.name, "Father 15");
    assert.match(panel.rows[0]?.context ?? "", /Assigned 25 days ago/);
  });

  it("returns nothing for the reviewer role even when men qualify", () => {
    const panel = buildNudgePanel({
      role: "reviewer",
      leaderFirstName: "Maya",
      t,
      now,
      fathers: [
        father({
          fatherId: "quiet",
          name: "Should not appear",
          cards: [card({ completed: 1 })],
          progress: [complete("s1", 20)],
        }),
      ],
    });
    assert.deepEqual(panel, { rows: [], hiddenCount: 0, reachableCount: 0 });
  });

  it("marks a father who turned off every channel as unreachable", () => {
    const panel = buildNudgePanel({
      role: "manager",
      leaderFirstName: "Maya",
      t,
      now,
      fathers: [
        father({
          fatherId: "off",
          name: "Quiet Off",
          reachability: {
            pushEnabled: false,
            emailEnabled: false,
            hasPush: false,
            leaderEncouragement: true,
            timezone: "UTC",
            quietHoursStart: "21:00",
            quietHoursEnd: "07:00",
          },
        }),
      ],
    });
    assert.equal(panel.rows[0]?.canReach, false);
    assert.equal(canReachFather({
      pushEnabled: true,
      emailEnabled: false,
      hasPush: false,
      leaderEncouragement: true,
      timezone: "UTC",
      quietHoursStart: "21:00",
      quietHoursEnd: "07:00",
    }), false);
  });

  it("builds 500 stalls in well under a second", () => {
    const fathers = Array.from({ length: 500 }, (_, index) =>
      father({
        fatherId: `bulk-${index}`,
        name: `Father ${index}`,
        assignments: [assignment(`bulk-${index}`, 12)],
      })
    );
    const started = Date.now();
    const panel = buildNudgePanel({
      role: "manager",
      leaderFirstName: "Maya",
      t,
      now,
      fathers,
    });
    assert.ok(Date.now() - started < 1000);
    assert.equal(panel.rows.length, 10);
    assert.equal(panel.hiddenCount, 490);
  });
});

describe("message copy", () => {
  it("uses tier wording and never names days, streaks, or program categories", () => {
    const a = nudgeMessage({
      tier: "A",
      locale: "en",
      leaderFirstName: "Maya",
      minutes: 8,
      completed: 0,
      total: 5,
      trainingTitle: "Fathering Fundamentals",
    });
    assert.equal(a.title, "A note from Maya");
    assert.equal(a.body, "Your first session is open. It is 8 minutes.");

    const b = nudgeMessage({
      tier: "B",
      locale: "en",
      leaderFirstName: "Maya",
      minutes: 8,
      completed: 3,
      total: 5,
      trainingTitle: "Fathering Fundamentals",
    });
    assert.equal(
      b.body,
      "You are 3 of 5 through Fathering Fundamentals. Continue when you can."
    );

    const c = nudgeMessage({
      tier: "C",
      locale: "en",
      leaderFirstName: "Maya",
      minutes: 8,
      completed: 2,
      total: 5,
      trainingTitle: "Fathering Fundamentals",
    });
    assert.equal(c.body, "Your training is still open.");

    for (const copy of [a, b, c]) {
      assertSafeCopy(copy.title, copy.body);
    }
  });

  it("drops the minutes sentence when runtime is unknown", () => {
    const copy = nudgeMessage({
      tier: "A",
      locale: "en",
      leaderFirstName: "Maya",
      minutes: null,
      completed: 0,
      total: 5,
      trainingTitle: "Fathering Fundamentals",
    });
    assert.equal(copy.body, "Your first session is open.");
    assert.equal(copy.body.includes("minutes"), false);
  });

  it("renders Hebrew encouragement without day counts or forbidden words", () => {
    const a = notificationCopy(
      "leader_encouragement",
      { nudgeTier: "A", leaderName: "מאיה", minutes: 8 },
      "he"
    );
    const b = notificationCopy(
      "leader_encouragement",
      {
        nudgeTier: "B",
        leaderName: "מאיה",
        completedCount: 3,
        sessionCount: 5,
        trainingTitle: "יסודות אבהות",
      },
      "he"
    );
    const c = notificationCopy("leader_encouragement", { nudgeTier: "C", leaderName: "מאיה" }, "he");
    assert.equal(a.title, "הערה מאת מאיה");
    assert.match(a.body, /דקות/);
    for (const copy of [a, b, c]) {
      assertSafeCopy(copy.title, copy.body);
      assert.equal(HEBREW_FORBIDDEN.test(copy.title), false);
      assert.equal(HEBREW_FORBIDDEN.test(copy.body), false);
    }
  });

  it("keeps the generic leader note when no tier is set", () => {
    const copy = notificationCopy("leader_encouragement", {}, "en");
    assert.equal(copy.title, "A note from your leader");
  });

  it("does not leak notes or day counts through the payload", () => {
    const payload = safePayload({
      nudgeTier: "B",
      completedCount: 2,
      sessionCount: 5,
      leaderName: "Maya",
      daysSince: 41,
      actionSummary: "I yelled at my kid",
      outcome_note: "Named the bedtime check-in",
    });
    assert.equal(payload.nudgeTier, "B");
    assert.equal(payload.completedCount, 2);
    assert.equal("daysSince" in payload, false);
    assert.equal("outcome_note" in payload, false);
    assert.equal(payload.actionSummary, "this week's practice");
  });
});

describe("quiet hours and ceiling", () => {
  it("queues 22:30 local for 07:00 local the next morning", () => {
    const at = new Date("2026-08-18T19:30:00.000Z");
    const next = nextQuietEnd(at, "Asia/Jerusalem", "07:00");
    assert.equal(next.toISOString(), "2026-08-19T04:00:00.000Z");
  });

  it("uses today's quiet end when it is still morning", () => {
    const at = new Date("2026-08-19T03:30:00.000Z");
    const next = nextQuietEnd(at, "Asia/Jerusalem", "07:00");
    assert.equal(next.toISOString(), "2026-08-19T04:00:00.000Z");
  });

  it("still sends a leader note when the 3-per-7-day ceiling is already full", () => {
    const picked = pickWithinCeiling(
      [{ type: "weekly_session" as const }, { type: "leader_encouragement" as const }],
      3
    );
    assert.equal(picked.length, 1);
    assert.equal(picked[0]?.type, "leader_encouragement");
  });
});

describe("helpers", () => {
  it("takes the leader first name only", () => {
    assert.equal(leaderFirstName("Maya Cohen"), "Maya");
    assert.equal(leaderFirstName("  "), "");
  });

  it("marks Hebrew mail as RTL", () => {
    assert.deepEqual(transactionalEmailAttrs("he"), {
      lang: "he",
      dir: "rtl",
      textAlign: "right",
    });
    assert.equal(transactionalEmailAttrs("en").dir, "ltr");
  });
});
