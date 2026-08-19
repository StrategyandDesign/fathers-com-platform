import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseDisplayName } from "../lib/account/display-name";
import { managerDisplayTitleLabel } from "../lib/account/display-title";
import { shouldShowReminderSchedule } from "../lib/account/preferences";
import { createTranslator } from "../lib/i18n/translate";

describe("parseDisplayName", () => {
  it("trims and collapses whitespace", () => {
    assert.deepEqual(parseDisplayName("  Maya   Chen  "), { name: "Maya Chen" });
  });

  it("keeps Hebrew names", () => {
    assert.deepEqual(parseDisplayName("מאיה כהן"), { name: "מאיה כהן" });
  });

  it("requires a name", () => {
    assert.deepEqual(parseDisplayName("   "), { error: "required" });
    assert.deepEqual(parseDisplayName(""), { error: "required" });
  });

  it("rejects names over 80 characters", () => {
    assert.deepEqual(parseDisplayName("A".repeat(81)), { error: "tooLong" });
    assert.deepEqual(parseDisplayName("A".repeat(80)), { name: "A".repeat(80) });
  });
});

describe("manager display title", () => {
  it("names Leader and Manager as different designations", () => {
    const t = createTranslator("en");
    assert.equal(managerDisplayTitleLabel("leader", t), "Leader");
    assert.equal(managerDisplayTitleLabel("manager", t), "Manager");
  });
});

describe("reminder schedule visibility", () => {
  it("shows When to send it only while the weekly session reminder is on", () => {
    assert.equal(shouldShowReminderSchedule({ session_reminders: true }), true);
    assert.equal(shouldShowReminderSchedule({ session_reminders: false }), false);
  });
});
