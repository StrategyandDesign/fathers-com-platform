import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canOpenOnboardingStep,
  currentOnboardingStep,
  defaultRemindAt,
  isAssignedSessionPath,
  isFatherStartPath,
  isOnboardingActive,
  nextStepAfterAnswer,
  onboardingHref,
  parseRemindAt,
  parseSetupAnswers,
  parseWeekday,
  resolveOnboardingMode,
} from "../lib/father/onboarding";

describe("first-run skip logic", () => {
  it("never reopens the flow after it is complete", () => {
    assert.equal(
      resolveOnboardingMode({ completedAt: "2026-08-18T00:00:00Z", hasCompletedSession: false }),
      "done"
    );
    assert.equal(
      currentOnboardingStep({
        mode: "done",
        storedStep: "welcome",
        hasReminder: false,
        hasAssignedSession: true,
      }),
      "done"
    );
  });

  it("sends an existing father with completed sessions to the reminder once", () => {
    assert.equal(
      resolveOnboardingMode({ completedAt: null, hasCompletedSession: true }),
      "reminder-only"
    );
    assert.equal(
      currentOnboardingStep({
        mode: "reminder-only",
        storedStep: "welcome",
        hasReminder: false,
        hasAssignedSession: true,
      }),
      "reminder"
    );
    assert.equal(
      resolveOnboardingMode({
        completedAt: null,
        hasCompletedSession: true,
        hasReminder: true,
      }),
      "done"
    );
  });

  it("resumes a new father at the stored step", () => {
    assert.equal(
      currentOnboardingStep({
        mode: "full",
        storedStep: "when",
        hasReminder: false,
        hasAssignedSession: true,
      }),
      "when"
    );
    assert.equal(onboardingHref("when"), "/father/start/when");
    assert.equal(nextStepAfterAnswer("when"), "reminder");
  });

  it("opens the completion screen if session 1 is already finished", () => {
    assert.equal(
      currentOnboardingStep({
        mode: "full",
        storedStep: "session",
        hasReminder: true,
        hasAssignedSession: true,
        firstSessionComplete: true,
      }),
      "complete"
    );
    assert.equal(
      currentOnboardingStep({
        mode: "done",
        storedStep: "session",
        hasReminder: true,
        hasAssignedSession: true,
        firstSessionComplete: true,
        completedAt: null,
      }),
      "complete"
    );
  });

  it("holds when nothing is assigned and opens session 1 when it is", () => {
    assert.equal(
      currentOnboardingStep({
        mode: "full",
        storedStep: "session",
        hasReminder: true,
        hasAssignedSession: false,
      }),
      "hold"
    );
    assert.equal(
      currentOnboardingStep({
        mode: "full",
        storedStep: "hold",
        hasReminder: true,
        hasAssignedSession: true,
      }),
      "session"
    );
  });

  it("does not let a father skip ahead of the stored step", () => {
    assert.equal(canOpenOnboardingStep("reminder", "skill"), false);
    assert.equal(canOpenOnboardingStep("children", "skill"), false);
    assert.equal(canOpenOnboardingStep("welcome", "welcome"), true);
    assert.equal(canOpenOnboardingStep("hold", "session"), true);
  });
});

describe("reminder defaults", () => {
  it("maps the third setup answer to a concrete time", () => {
    assert.equal(defaultRemindAt("early_morning"), "07:00");
    assert.equal(defaultRemindAt("lunch"), "12:00");
    assert.equal(defaultRemindAt("evening"), "19:00");
    assert.equal(defaultRemindAt("late_night"), "21:30");
  });

  it("accepts a day and a clock time", () => {
    assert.equal(parseWeekday("3"), 3);
    assert.equal(parseWeekday("7"), null);
    assert.equal(parseRemindAt("19:00"), "19:00");
    assert.equal(parseRemindAt("19:00:00"), "19:00");
    assert.equal(parseRemindAt("25:00"), null);
  });
});

describe("start routes", () => {
  it("recognizes start and assigned session paths", () => {
    assert.equal(isFatherStartPath("/father/start/reminder"), true);
    assert.equal(isFatherStartPath("/father"), false);
    assert.equal(
      isAssignedSessionPath("/father/sessions/abc/checkin", "abc"),
      true
    );
    assert.equal(isAssignedSessionPath("/father/sessions/other", "abc"), false);
  });

  it("treats first-run chrome as a closed funnel until the flow is done", () => {
    assert.equal(isOnboardingActive("full", "session"), true);
    assert.equal(isOnboardingActive("reminder-only", "reminder"), true);
    assert.equal(isOnboardingActive("done", "done"), false);
    assert.equal(isOnboardingActive("full", "done"), false);
  });

  it("keeps unknown setup answers off the profile", () => {
    const parsed = parseSetupAnswers({
      children: "1",
      skill: "mood",
      when: "evening",
      notes: "skip me",
    });
    assert.deepEqual(parsed, { children: "1", when: "evening" });
  });
});
