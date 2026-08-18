import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  closedWeekStart,
  closedWeeksToEvaluate,
  completionCountsForWeek,
  deriveCurrentStreak,
  deriveLongestStreak,
  evaluateClosedWeek,
  fatherWeekStreak,
  hadAssignedOpenSession,
  ledgerFromCountedWeeks,
  mondayWeekStart,
  replenishFreezes,
  streakGridWeeks,
} from "../lib/father/streak";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

describe("monday week keys", () => {
  it("starts the week on Monday in UTC", () => {
    assert.equal(mondayWeekStart(new Date("2026-08-16T12:00:00Z"), "UTC"), "2026-08-10");
    assert.equal(mondayWeekStart(new Date("2026-08-17T00:00:00Z"), "UTC"), "2026-08-17");
    assert.equal(mondayWeekStart(new Date("2026-08-23T23:00:00Z"), "UTC"), "2026-08-17");
  });

  it("evaluates a UTC+ week after that father's Sunday night", () => {
    const sundayUtc = new Date("2026-08-16T21:30:00Z");
    assert.equal(mondayWeekStart(sundayUtc, "UTC"), "2026-08-10");
    assert.equal(closedWeekStart(sundayUtc, "UTC"), "2026-08-03");
    assert.equal(mondayWeekStart(sundayUtc, "Asia/Jerusalem"), "2026-08-17");
    assert.equal(closedWeekStart(sundayUtc, "Asia/Jerusalem"), "2026-08-10");
    assert.deepEqual(
      closedWeeksToEvaluate({
        now: sundayUtc,
        timeZone: "Asia/Jerusalem",
        lastEvaluatedWeek: "2026-08-03",
      }),
      ["2026-08-10"]
    );
    assert.deepEqual(
      closedWeeksToEvaluate({
        now: sundayUtc,
        timeZone: "UTC",
        lastEvaluatedWeek: "2026-08-03",
      }),
      []
    );
  });

  it("assigns a boundary completion in the father's timezone", () => {
    const at = new Date("2026-08-17T04:00:00Z");
    assert.equal(mondayWeekStart(at, "America/Chicago"), "2026-08-10");
    assert.equal(mondayWeekStart(at, "Asia/Jerusalem"), "2026-08-17");
  });
});

describe("weekly streak from completions", () => {
  it("counts two sessions in one week as one week", () => {
    const streak = fatherWeekStreak({
      completedAt: ["2026-08-18T15:00:00Z", "2026-08-19T15:00:00Z"],
      timeZone: "UTC",
      now: new Date("2026-08-19T16:00:00Z"),
    });
    assert.equal(streak.weeks, 1);
    assert.deepEqual(streak.weekKeys, ["2026-08-17"]);
    assert.equal(
      completionCountsForWeek(
        ["2026-08-18T15:00:00Z", "2026-08-19T15:00:00Z"],
        "2026-08-17",
        "UTC"
      ),
      true
    );
  });

  it("keeps last week while the current week is still open", () => {
    const streak = fatherWeekStreak({
      completedAt: ["2026-08-11T12:00:00Z"],
      timeZone: "UTC",
      now: new Date("2026-08-18T16:00:00Z"),
    });
    assert.equal(streak.weeks, 1);
    assert.deepEqual(streak.weekKeys, ["2026-08-10"]);
  });

  it("resets after a gap with no counted week", () => {
    const streak = fatherWeekStreak({
      completedAt: ["2026-08-02T12:00:00Z"],
      timeZone: "UTC",
      now: new Date("2026-08-18T16:00:00Z"),
    });
    assert.equal(streak.weeks, 0);
  });
});

describe("closed week evaluation", () => {
  it("is idempotent when the ledger already has the week", () => {
    const first = evaluateClosedWeek({
      alreadyRecorded: null,
      completedInWeek: false,
      hadAssignedOpenSession: true,
      freezesRemaining: 2,
    });
    const second = evaluateClosedWeek({
      alreadyRecorded: "frozen",
      completedInWeek: false,
      hadAssignedOpenSession: true,
      freezesRemaining: 1,
    });
    assert.deepEqual(first, { kind: "frozen", freezesRemaining: 1 });
    assert.deepEqual(second, { kind: "noop", outcome: "frozen" });
  });

  it("preserves the streak and consumes one freeze on a miss", () => {
    const result = evaluateClosedWeek({
      alreadyRecorded: null,
      completedInWeek: false,
      hadAssignedOpenSession: true,
      freezesRemaining: 2,
    });
    assert.deepEqual(result, { kind: "frozen", freezesRemaining: 1 });
    const ledger = ledgerFromCountedWeeks(["2026-08-03"]);
    ledger.set("2026-08-10", "frozen");
    assert.equal(deriveCurrentStreak(ledger, "2026-08-17"), 1);
  });

  it("resets the streak when a miss has no freeze", () => {
    const result = evaluateClosedWeek({
      alreadyRecorded: null,
      completedInWeek: false,
      hadAssignedOpenSession: true,
      freezesRemaining: 0,
    });
    assert.equal(result.kind, "missed");
    const ledger = ledgerFromCountedWeeks(["2026-08-03"]);
    ledger.set("2026-08-10", "missed");
    assert.equal(deriveCurrentStreak(ledger, "2026-08-17"), 0);
    assert.equal(deriveLongestStreak(ledger), 1);
  });

  it("records a week with nothing assigned as neutral", () => {
    const result = evaluateClosedWeek({
      alreadyRecorded: null,
      completedInWeek: false,
      hadAssignedOpenSession: false,
      freezesRemaining: 2,
    });
    assert.equal(result.kind, "neutral");
    const ledger = ledgerFromCountedWeeks(["2026-08-03"]);
    ledger.set("2026-08-10", "neutral");
    assert.equal(deriveCurrentStreak(ledger, "2026-08-17"), 1);
  });

  it("does not treat a timezone change as a miss", () => {
    const result = evaluateClosedWeek({
      alreadyRecorded: null,
      completedInWeek: false,
      hadAssignedOpenSession: true,
      freezesRemaining: 2,
      timezoneChanged: true,
    });
    assert.equal(result.kind, "neutral");
  });

  it("counts the week when a session was finished in it", () => {
    const result = evaluateClosedWeek({
      alreadyRecorded: null,
      completedInWeek: true,
      hadAssignedOpenSession: true,
      freezesRemaining: 2,
    });
    assert.equal(result.kind, "counted");
  });
});

describe("assigned open sessions", () => {
  it("is closed when nothing was assigned before the week ended", () => {
    assert.equal(
      hadAssignedOpenSession({
        weekEnd: new Date("2026-08-17T00:00:00Z"),
        trainings: [{ id: "t1" }],
        assignments: [],
        sessions: [
          {
            sessionId: "s1",
            trainingId: "t1",
            catalogIndex: 0,
            completedAt: null,
            flagsComplete: false,
          },
        ],
      }),
      false
    );
  });

  it("is open when an assigned session was still unfinished at week end", () => {
    assert.equal(
      hadAssignedOpenSession({
        weekEnd: new Date("2026-08-17T00:00:00Z"),
        trainings: [{ id: "t1" }],
        assignments: [{ trainingId: "t1", assignedAt: new Date("2026-08-01T00:00:00Z") }],
        sessions: [
          {
            sessionId: "s1",
            trainingId: "t1",
            catalogIndex: 0,
            completedAt: null,
            flagsComplete: false,
          },
        ],
      }),
      true
    );
  });

  it("is closed when the only assigned session was finished before the week ended", () => {
    assert.equal(
      hadAssignedOpenSession({
        weekEnd: new Date("2026-08-17T00:00:00Z"),
        trainings: [{ id: "t1" }],
        assignments: [{ trainingId: "t1", assignedAt: new Date("2026-08-01T00:00:00Z") }],
        sessions: [
          {
            sessionId: "s1",
            trainingId: "t1",
            catalogIndex: 0,
            completedAt: new Date("2026-08-10T12:00:00Z"),
            flagsComplete: true,
          },
        ],
      }),
      false
    );
  });

  it("counts an assigned training with an unfinished session", () => {
    assert.equal(
      hadAssignedOpenSession({
        weekEnd: new Date("2026-08-17T00:00:00Z"),
        trainings: [{ id: "t1" }],
        assignments: [{ trainingId: "t1", assignedAt: new Date("2026-08-01T00:00:00Z") }],
        sessions: [
          {
            sessionId: "s1",
            trainingId: "t1",
            catalogIndex: 0,
            completedAt: null,
            flagsComplete: false,
          },
        ],
      }),
      true
    );
  });
});

describe("freeze replenish", () => {
  it("caps at two and does not bank unused periods", () => {
    const now = new Date("2026-08-18T12:00:00Z");
    const result = replenishFreezes({
      freezesRemaining: 2,
      lastReplenishedAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      now,
      periodMs: THIRTY_DAYS,
    });
    assert.equal(result.freezesRemaining, 2);
    assert.equal(result.gained, 0);
    assert.ok(result.lastReplenishedAt.getTime() <= now.getTime());
    assert.ok(result.lastReplenishedAt.getTime() + THIRTY_DAYS > now.getTime());
  });

  it("returns one freeze after thirty days when below the cap", () => {
    const last = new Date("2026-07-18T12:00:00Z");
    const result = replenishFreezes({
      freezesRemaining: 1,
      lastReplenishedAt: last,
      now: new Date("2026-08-18T12:00:00Z"),
      periodMs: THIRTY_DAYS,
    });
    assert.equal(result.freezesRemaining, 2);
    assert.equal(result.gained, 1);
  });
});

describe("derived cache", () => {
  it("lets frozen and neutral weeks bridge a counted run", () => {
    const weeks = new Map([
      ["2026-07-27", "counted" as const],
      ["2026-08-03", "frozen" as const],
      ["2026-08-10", "neutral" as const],
      ["2026-08-17", "counted" as const],
    ]);
    assert.equal(deriveCurrentStreak(weeks, "2026-08-17"), 2);
    assert.equal(deriveLongestStreak(weeks), 2);
  });

  it("builds a twelve-week grid ending on the current Monday", () => {
    assert.deepEqual(streakGridWeeks("2026-08-17").at(-1), "2026-08-17");
    assert.equal(streakGridWeeks("2026-08-17").length, 12);
    assert.equal(streakGridWeeks("2026-08-17")[0], "2026-06-01");
  });
});
