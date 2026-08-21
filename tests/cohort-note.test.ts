import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  canSeeCohortNoteAudience,
  decorateCohortNoteDesk,
  fatherIdsForCohortNoteAudience,
  parseCohortNoteAudience,
} from "../lib/cohort-note/audience";
import { cohortNoteSegments, safeCohortNoteHref } from "../lib/cohort-note/links";
import {
  composeCohortNoteParts,
  isCohortNoteVisible,
  normalizeCohortNote,
  otherLeaderTickers,
  resolveCohortNoteAuthorName,
} from "../lib/cohort-note/types";
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

  it("keeps whole-cohort notes for everyone and training notes for assigned men", () => {
    assert.equal(canSeeCohortNoteAudience(null, ["coming-home"]), true);
    assert.equal(canSeeCohortNoteAudience("coming-home", ["coming-home"]), true);
    assert.equal(canSeeCohortNoteAudience("coming-home", ["steady"]), false);
    assert.deepEqual(
      fatherIdsForCohortNoteAudience({
        audienceTrainingId: null,
        memberIds: ["a", "b"],
        assignedPairs: [{ fatherId: "a", trainingId: "coming-home" }],
      }),
      ["a", "b"]
    );
    assert.deepEqual(
      fatherIdsForCohortNoteAudience({
        audienceTrainingId: "coming-home",
        memberIds: ["a", "b"],
        assignedPairs: [
          { fatherId: "a", trainingId: "coming-home" },
          { fatherId: "b", trainingId: "steady" },
        ],
      }),
      ["a"]
    );
    assert.equal(parseCohortNoteAudience(""), null);
    assert.equal(parseCohortNoteAudience("cohort"), null);
    assert.equal(parseCohortNoteAudience("coming-home"), "coming-home");
  });

  it("puts the posting leader’s displayed name on the father’s update", () => {
    assert.equal(
      resolveCohortNoteAuthorName("manager2", [
        { id: "brenda", name: "Brenda" },
        { id: "manager2", name: "Manager 2" },
      ]),
      "Manager 2"
    );
    assert.equal(resolveCohortNoteAuthorName("missing", [{ id: "brenda", name: "Brenda" }]), null);
    const card = readFileSync(
      fileURLToPath(new URL("../components/father/cohort-note-card.tsx", import.meta.url)),
      "utf8"
    );
    const data = readFileSync(
      fileURLToPath(new URL("../lib/cohort-note/data.ts", import.meta.url)),
      "utf8"
    );
    const copy = readFileSync(
      fileURLToPath(new URL("../lib/i18n/messages/en.ts", import.meta.url)),
      "utf8"
    );
    assert.match(card, /father\.home\.noteEyebrow/);
    assert.match(card, /authorName/);
    assert.match(card, /normal-case/);
    assert.match(data, /loadFatherLeaders/);
    assert.match(data, /resolveCohortNoteAuthorName/);
    assert.match(copy, /noteEyebrowFrom: "From your leader: \{name\}"/);
  });

  it("lists other leaders and their current updates, including quiet ones", () => {
    const tickers = otherLeaderTickers({
      viewerId: "brenda",
      leaders: [
        { id: "brenda", name: "Brenda", staffRole: "manager" },
        { id: "manager2", name: "Manager 2", staffRole: "manager" },
        { id: "reviewer", name: "Reviewer", staffRole: "reviewer" },
      ],
      peers: [
        {
          authorId: "manager2",
          authorName: "Manager 2",
          body: "See you Tuesday.",
          updatedAt: "2026-08-20T20:17:00.000Z",
        },
      ],
    });
    assert.equal(tickers.length, 1);
    assert.equal(tickers[0]?.leader.name, "Manager 2");
    assert.equal(tickers[0]?.note?.body, "See you Tuesday.");
    assert.equal(
      otherLeaderTickers({
        viewerId: "brenda",
        leaders: [
          { id: "brenda", name: "Brenda", staffRole: "manager" },
          { id: "manager2", name: "Manager 2", staffRole: "manager" },
        ],
        peers: [],
      })[0]?.note,
      null
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
    assert.match(desk, /noteAudience/);
    assert.match(desk, /audience_training_id/);
    assert.match(desk, /noteLeadersMany/);
    assert.match(desk, /otherLeaderTickers/);
    assert.match(desk, /notePeerQuiet/);
    assert.match(desk, /sm:flex-row sm:flex-wrap/);
    assert.ok(desk.indexOf("noteClear") < desk.indexOf("staffEyebrow"));
    assert.ok(desk.indexOf("staffEyebrow") < desk.indexOf("notePeerShowing"));
    const data = readFileSync(
      fileURLToPath(new URL("../lib/cohort-note/data.ts", import.meta.url)),
      "utf8"
    );
    assert.match(data, /loadOrganizationStaff/);
    const messages = readFileSync(
      fileURLToPath(new URL("../lib/i18n/messages/en.ts", import.meta.url)),
      "utf8"
    );
    assert.match(messages, /A web address becomes a link they can open/);
    assert.match(messages, /Swap your update/);
    assert.match(messages, /Clear your update/);
  });

  it("offers whole cohort or one training, not a name checklist", () => {
    const desk = decorateCohortNoteDesk(
      [
        {
          groupId: "nwa",
          groupName: "Returning Home NWA",
          fatherCount: 0,
          audiences: [],
          leaders: [],
          own: null,
          peers: [],
        },
      ],
      {
        trainings: [
          {
            id: "coming-home",
            title: "Coming Home Present",
            order_index: 1,
            published: true,
            released_at: "2026-08-01T00:00:00.000Z",
            first_published_at: "2026-01-01T00:00:00.000Z",
            first_released_at: "2026-08-01T00:00:00.000Z",
          },
          {
            id: "steady",
            title: "Steady Under Pressure",
            order_index: 2,
            published: true,
            first_published_at: "2026-01-01T00:00:00.000Z",
          },
        ],
        reviews: [
          { group_id: "nwa", training_id: "coming-home", status: "accepted" },
        ],
        participants: [
          { fatherId: "a", groupId: "nwa" },
          { fatherId: "b", groupId: "nwa" },
        ],
        assignments: [{ father_id: "a", training_id: "coming-home" }],
      }
    );
    assert.equal(desk[0]?.fatherCount, 2);
    assert.deepEqual(
      desk[0]?.audiences.map((row) => [row.trainingId, row.assignedCount]),
      [
        ["coming-home", 1],
        ["steady", 0],
      ]
    );
    const actions = readFileSync(
      fileURLToPath(new URL("../lib/cohort-note/actions.ts", import.meta.url)),
      "utf8"
    );
    assert.match(actions, /parseCohortNoteAudience/);
    assert.match(actions, /fatherIdsForCohortNoteAudience/);
    const sql = readFileSync(
      fileURLToPath(new URL("../supabase/migrations/20260821040000_cohort_note_audience.sql", import.meta.url)),
      "utf8"
    );
    assert.match(sql, /audience_training_id/);
    assert.match(sql, /training_assignments/);
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
