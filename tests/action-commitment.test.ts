import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  actionLoopState,
  actionSessionEyebrow,
  actionSkillText,
  formatNamedMoment,
  isOpenActionCommitment,
  parseOutcomeNote,
  resolveIntentionAt,
  sessionChrome,
  shouldQueueActionReminder,
} from "../lib/father/action-commitment";
import { localParts } from "../lib/notifications/schedule";

describe("action loop states", () => {
  it("starts uncommitted, then I did it closes the session", () => {
    assert.equal(actionLoopState({ actionCompleted: false, commitment: null }), "commit");
    assert.equal(
      actionLoopState({
        actionCompleted: false,
        commitment: { committedAt: "2026-08-18T12:00:00Z", completedAt: null, closedAt: null },
      }),
      "do"
    );
    assert.equal(
      actionLoopState({
        actionCompleted: true,
        commitment: {
          committedAt: "2026-08-18T12:00:00Z",
          completedAt: "2026-08-18T18:00:00Z",
          closedAt: null,
        },
      }),
      "closed"
    );
    assert.equal(
      actionLoopState({
        actionCompleted: true,
        commitment: {
          committedAt: "2026-08-18T12:00:00Z",
          completedAt: "2026-08-18T18:00:00Z",
          closedAt: "2026-08-18T18:01:00Z",
        },
      }),
      "closed"
    );
  });

  it("queues the Action reminder only while the moment is still open", () => {
    assert.equal(shouldQueueActionReminder("commit"), false);
    assert.equal(shouldQueueActionReminder("do"), true);
    assert.equal(shouldQueueActionReminder("closed"), false);
    assert.equal(
      isOpenActionCommitment({ completedAt: null, closedAt: null }),
      true
    );
    assert.equal(
      isOpenActionCommitment({ completedAt: "2026-08-18T18:00:00Z", closedAt: null }),
      false
    );
  });

  it("keeps the outcome note at 140 characters", () => {
    assert.equal(parseOutcomeNote("  Named the bedtime check-in.  "), "Named the bedtime check-in.");
    assert.equal(parseOutcomeNote("x".repeat(200))?.length, 140);
    assert.equal(parseOutcomeNote("   "), null);
  });
});

describe("intention timestamps", () => {
  it("maps Tonight to 20:00 local and keeps it in the future", () => {
    const at = new Date("2026-08-18T16:00:00Z");
    const chicago = resolveIntentionAt({
      option: "tonight",
      at,
      timeZone: "America/Chicago",
    });
    const jerusalem = resolveIntentionAt({
      option: "tonight",
      at,
      timeZone: "Asia/Jerusalem",
    });
    assert.ok(chicago);
    assert.ok(jerusalem);
    assert.equal(localParts(chicago, "America/Chicago").hour, 20);
    assert.equal(localParts(jerusalem, "Asia/Jerusalem").hour, 20);
    assert.ok(chicago.getTime() > at.getTime());
    assert.ok(jerusalem.getTime() > at.getTime());
    assert.notEqual(chicago.toISOString(), jerusalem.toISOString());
  });

  it("rolls Tonight to the next local day when 20:00 has passed", () => {
    // 21:00 America/Chicago on 18 Aug 2026 is 02:00 UTC on 19 Aug.
    const at = new Date("2026-08-19T02:00:00Z");
    const resolved = resolveIntentionAt({
      option: "tonight",
      at,
      timeZone: "America/Chicago",
    });
    assert.ok(resolved);
    const local = localParts(resolved, "America/Chicago");
    assert.equal(local.dateKey, "2026-08-19");
    assert.equal(local.hour, 20);
  });

  it("rolls This weekend to next Saturday when Saturday 10:00 has passed", () => {
    const saturdayAfternoon = new Date("2026-08-22T16:00:00Z");
    const resolved = resolveIntentionAt({
      option: "this_weekend",
      at: saturdayAfternoon,
      timeZone: "America/Chicago",
    });
    assert.ok(resolved);
    const local = localParts(resolved, "America/Chicago");
    assert.equal(local.weekday, 6);
    assert.equal(local.hour, 10);
    assert.equal(local.dateKey, "2026-08-29");
  });

  it("maps This weekend to Saturday 10:00 local", () => {
    const tuesday = new Date("2026-08-18T15:00:00Z");
    const resolved = resolveIntentionAt({
      option: "this_weekend",
      at: tuesday,
      timeZone: "America/Chicago",
    });
    assert.ok(resolved);
    const local = localParts(resolved, "America/Chicago");
    assert.equal(local.weekday, 6);
    assert.equal(local.hour, 10);
    assert.equal(local.dateKey, "2026-08-22");
  });

  it("keeps a custom time in the father's timezone after a later timezone change", () => {
    const at = new Date("2026-08-18T12:00:00Z");
    const resolved = resolveIntentionAt({
      option: "custom",
      at,
      timeZone: "America/Chicago",
      customDate: "2026-08-19",
      customTime: "19:00",
    });
    assert.ok(resolved);
    assert.equal(localParts(resolved, "America/Chicago").hour, 19);
    assert.equal(localParts(resolved, "Asia/Jerusalem").hour, 3);
    assert.ok(resolved.getTime() > at.getTime());
  });

  it("maps At bedtime, On the drive, and Next time to a future local clock", () => {
    const at = new Date("2026-08-18T16:00:00Z");
    const bedtime = resolveIntentionAt({ option: "bedtime", at, timeZone: "America/Chicago" });
    const drive = resolveIntentionAt({ option: "drive", at, timeZone: "America/Chicago" });
    const next = resolveIntentionAt({ option: "next_time", at, timeZone: "America/Chicago" });
    assert.ok(bedtime && drive && next);
    assert.equal(localParts(bedtime, "America/Chicago").hour, 21);
    assert.equal(localParts(drive, "America/Chicago").hour, 17);
    assert.equal(localParts(drive, "America/Chicago").minute, 30);
    assert.equal(localParts(next, "America/Chicago").dateKey, "2026-08-19");
    assert.equal(localParts(next, "America/Chicago").hour, 19);
  });

  it("names a custom moment in the father's timezone", () => {
    const label = formatNamedMoment({
      label: "custom",
      intentionAt: "2026-08-19T00:00:00Z",
      timeZone: "America/Chicago",
      locale: "en-US",
      optionLabel: "Pick a time",
    });
    assert.match(label, /Aug/);
    assert.match(label, /18|19/);
    assert.equal(
      formatNamedMoment({
        label: "tonight",
        intentionAt: "2026-08-19T01:00:00Z",
        timeZone: "America/Chicago",
        locale: "en-US",
        optionLabel: "Tonight",
      }),
      "Tonight"
    );
  });

  it("rejects a custom time that is already past", () => {
    assert.equal(
      resolveIntentionAt({
        option: "custom",
        at: new Date("2026-08-18T19:00:00Z"),
        timeZone: "UTC",
        customDate: "2026-08-18",
        customTime: "12:00",
      }),
      null
    );
  });
});

describe("skill copy", () => {
  it("uses the catalog keyline, not father writing", () => {
    assert.equal(
      actionSkillText({ keyline: "Practice one calm check-in tonight", title: "Session 1" }),
      "Practice one calm check-in tonight"
    );
  });

  it("shows the session title only when it is not the skill", () => {
    assert.equal(
      actionSessionEyebrow({ title: "Fourth Secret: Protecting and Providing" }, "Physical, emotional, and spiritual safety and provision."),
      "Fourth Secret: Protecting and Providing"
    );
    assert.equal(
      actionSessionEyebrow({ title: "Practice one calm check-in tonight" }, "Practice one calm check-in tonight"),
      null
    );
  });

  it("keeps Action chrome to wayfinding so the skill can be the page", () => {
    assert.deepEqual(sessionChrome("film"), {
      showRuntime: true,
      showKeyline: true,
      showSessionHeading: true,
    });
    assert.deepEqual(sessionChrome("action"), {
      showRuntime: false,
      showKeyline: false,
      showSessionHeading: false,
    });
  });
});

describe("action finish step", () => {
  it("does not keep an optional-note finish screen on the action walk", () => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const loop = readFileSync(`${root}/components/father/action-loop.tsx`, "utf8");
    const form = readFileSync(`${root}/components/father/action-commitment-form.tsx`, "utf8");
    const father = readFileSync(
      `${root}/app/(father)/father/sessions/[sessionId]/action/page.tsx`,
      "utf8"
    );
    const practice = readFileSync(
      `${root}/app/(manager)/manager/practice/sessions/[sessionId]/action/page.tsx`,
      "utf8"
    );
    const door = readFileSync(`${root}/lib/father/action-commitment.ts`, "utf8");
    assert.doesNotMatch(loop, /ActionFinishForm/);
    assert.doesNotMatch(form, /ActionFinishForm/);
    assert.doesNotMatch(father, /finishActionSession/);
    assert.doesNotMatch(practice, /finishActionSession/);
    assert.doesNotMatch(door, /"finish"/);
    assert.match(form, /father\.session\.iDidIt/);
  });
});
