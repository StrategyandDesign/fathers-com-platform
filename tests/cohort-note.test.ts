import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { cohortNoteSegments, safeCohortNoteHref } from "../lib/cohort-note/links";
import { composeCohortNoteParts, isCohortNoteVisible, normalizeCohortNote } from "../lib/cohort-note/types";
import { formatShortDateTime } from "../lib/i18n/dates";
import { notificationCopy, safePayload } from "../lib/notifications/copy";
import { fatherHomeHref, isFatherDeepLink, normalizeDeepLink } from "../lib/notifications/links";

describe("cohort note helpers", () => {
  it("collapses whitespace and trims", () => {
    assert.equal(normalizeCohortNote("  Tuesday  7pm  "), "Tuesday 7pm");
    assert.equal(normalizeCohortNote("\n\n"), "");
  });

  it("keeps the timestamp beside the body instead of writing it into storage", () => {
    const body = normalizeCohortNote("Meet Tuesday at 7.");
    const stamp = formatShortDateTime("2026-08-18T13:14:00.000Z", "en");
    const parts = composeCohortNoteParts(body, stamp);
    assert.equal(body.includes("2026"), false);
    assert.match(stamp, /2026/);
    assert.equal(parts.body, "Meet Tuesday at 7.");
    assert.equal(parts.stamp, stamp);
    assert.equal(composeCohortNoteParts(body, "—").stamp, null);
    assert.equal(composeCohortNoteParts(body, "  ").stamp, null);
  });

  it("shows the note until this father dismisses it, then again after a replace", () => {
    assert.equal(isCohortNoteVisible("2026-08-18T12:00:00.000Z", null), true);
    assert.equal(
      isCohortNoteVisible("2026-08-18T12:00:00.000Z", "2026-08-18T12:05:00.000Z"),
      false
    );
    assert.equal(
      isCohortNoteVisible("2026-08-18T13:00:00.000Z", "2026-08-18T12:05:00.000Z"),
      true
    );
  });
});

describe("cohort note notifications", () => {
  it("uses catalog copy and the existing leader-note preference", () => {
    const english = notificationCopy(
      "leader_encouragement",
      { leaderName: "James", cohortNote: true },
      "en"
    );
    assert.equal(english.title, "A note from James");
    assert.equal(english.body, "It is on Home. You can dismiss it.");

    const hebrew = notificationCopy(
      "leader_encouragement",
      { leaderName: "James", cohortNote: true },
      "he"
    );
    assert.equal(hebrew.title, "הערה מאת James");
    assert.match(hebrew.body, /הבית/);

    const payload = safePayload({
      leaderName: "James",
      cohortNote: true,
      notes: "skip",
    });
    assert.equal(payload.cohortNote, true);
    assert.equal("notes" in payload, false);
  });

  it("can deep-link the note to Home", () => {
    assert.equal(fatherHomeHref(), "/father");
    assert.equal(isFatherDeepLink("/father"), true);
    assert.equal(normalizeDeepLink("/father"), "/father");
  });
});

describe("home update desk", () => {
  it("turns a web address into a clickable http or https link", () => {
    const segments = cohortNoteSegments("Meet at https://maps.example/place. Bring water.");
    assert.deepEqual(segments, [
      { type: "text", value: "Meet at " },
      { type: "link", href: "https://maps.example/place", value: "https://maps.example/place" },
      { type: "text", value: ". Bring water." },
    ]);
    assert.equal(safeCohortNoteHref("www.fathers.com"), "https://www.fathers.com/");
    assert.equal(safeCohortNoteHref("javascript:alert(1)"), null);
    assert.equal(safeCohortNoteHref("https://evil:pass@example.com"), null);
    assert.equal(safeCohortNoteHref("https://ok.example/path)"), "https://ok.example/path");
    assert.equal(
      safeCohortNoteHref("https://en.wikipedia.org/wiki/Father_(title)"),
      "https://en.wikipedia.org/wiki/Father_(title)"
    );
  });

  it("renders the update body as a real link, not raw HTML", () => {
    const message = readFileSync(
      fileURLToPath(new URL("../components/cohort-note/message.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(message, /cohortNoteSegments/);
    assert.match(message, /target="_blank"/);
    assert.match(message, /rel="noopener noreferrer"/);
    assert.doesNotMatch(message, /dangerouslySetInnerHTML/);
  });

  it("does not keep a What they see preview on the composer", () => {
    const desk = readFileSync(
      fileURLToPath(new URL("../components/manager/cohort-note-desk.tsx", import.meta.url)),
      "utf8"
    );
    assert.doesNotMatch(desk, /notePreview/);
    assert.doesNotMatch(desk, /noteStampPreview/);
    assert.match(desk, /noteNowShowing/);
    const messages = readFileSync(
      fileURLToPath(new URL("../lib/i18n/messages/en.ts", import.meta.url)),
      "utf8"
    );
    assert.match(messages, /A web address becomes a link they can open/);
  });
});

describe("father dismiss", () => {
  it("upserts a dismiss on the note and father", () => {
    const actions = readFileSync(
      fileURLToPath(new URL("../lib/cohort-note/actions.ts", import.meta.url)),
      "utf8"
    );
    assert.match(actions, /dismissCohortNote/);
    assert.match(actions, /onConflict: "note_id,father_id"/);
    assert.match(actions, /father\.home\.noteDismissFailed/);
  });
});
