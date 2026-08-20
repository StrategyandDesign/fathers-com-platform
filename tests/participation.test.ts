import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { translateNudgeTemplate } from "../lib/i18n/flash";
import { createTranslator } from "../lib/i18n/translate";
import {
  parseParticipationMode,
  participationCopyKey,
  participationModeFromGroups,
} from "../lib/participation";
import { notificationCopy } from "../lib/notifications/copy";

describe("participation mode", () => {
  it("treats unknown or missing values as unset", () => {
    assert.equal(parseParticipationMode(null), "unset");
    assert.equal(parseParticipationMode("mandatory"), "unset");
    assert.equal(parseParticipationMode("expected"), "expected");
  });

  it("uses a group’s mode, and stays unset when groups disagree", () => {
    assert.equal(
      participationModeFromGroups([{ participation_mode: "expected" }]),
      "expected"
    );
    assert.equal(
      participationModeFromGroups([
        { participation_mode: "expected" },
        { participation_mode: "open" },
      ]),
      "unset"
    );
  });

  it("keeps shared copy keys for the default", () => {
    assert.equal(participationCopyKey("unset", "father.home.nothingAssignedBody"), "father.home.nothingAssignedBody");
    assert.equal(
      participationCopyKey("expected", "father.home.nothingAssignedBody"),
      "father.home.nothingAssignedBodyExpected"
    );
  });

  it("names who Open is for the same way Expected names rooms", () => {
    const en = readFileSync(fileURLToPath(new URL("../lib/i18n/messages/en.ts", import.meta.url)), "utf8");
    assert.match(
      en,
      /Rehab, Armed Forces Unit, or Performance Optimization Group where completion is expected/
    );
    assert.match(en, /Workout groups and other voluntary clubs where men set the pace/);
    assert.doesNotMatch(en, /Voluntary participation\. Participants set their pace/);
    assert.match(
      en,
      /how fathers hear assigned training — as expected work, as an offer, or in plain language/
    );
    assert.match(en, /Who you can assign stays the same/);
  });
});

describe("notification copy by participation mode", () => {
  it("keeps default notes factual, not invitational or obligatory", () => {
    const copy = notificationCopy("leader_encouragement", { nudgeTier: "A", minutes: 8 }, "en");
    assert.match(copy.body, /first session is open/);
    assert.equal(copy.body.includes("when you are ready"), false);
    assert.equal(copy.body.includes("must"), false);
  });

  it("uses expected framing without late or required language", () => {
    const weekly = notificationCopy(
      "weekly_session",
      { trainingTitle: "Fathering Fundamentals", participationMode: "expected" },
      "en"
    );
    const assigned = notificationCopy(
      "new_assignment",
      { trainingTitle: "Fathering Fundamentals", leaderName: "Maya", sessionCount: 6, participationMode: "expected" },
      "en"
    );
    assert.match(weekly.title, /assigned session/i);
    assert.match(assigned.title, /assigned/i);
    assert.equal(/\b(late|required|must|rehab|unit)\b/i.test(`${weekly.title} ${weekly.body}`), false);
    assert.equal(/\b(late|required|must|rehab|unit)\b/i.test(`${assigned.title} ${assigned.body}`), false);
  });

  it("uses open invitation framing when the group chooses it", () => {
    const copy = notificationCopy(
      "leader_encouragement",
      { nudgeTier: "C", participationMode: "open" },
      "en"
    );
    assert.match(copy.body, /whenever you want it/);
  });
});

describe("manager note previews by participation mode", () => {
  const t = createTranslator("en");

  it("keeps the default preview factual", () => {
    const preview = translateNudgeTemplate("continue", t).preview;
    assert.equal(preview, "The next session is still open.");
    assert.equal(preview.includes("when he wants"), false);
    assert.equal(preview.includes("assigned"), false);
  });

  it("varies only the preview, not the label", () => {
    assert.equal(translateNudgeTemplate("continue", t, "expected").label, "Continue");
    assert.equal(
      translateNudgeTemplate("continue", t, "expected").preview,
      "The assigned session is still open."
    );
    assert.equal(
      translateNudgeTemplate("continue", t, "open").preview,
      "The next session is still here when he wants it."
    );
  });
});
