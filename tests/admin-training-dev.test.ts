import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  ARCHIVE_RELEASE_ERROR,
  PREVIEW_REQUIRED_ERROR,
  READY_REQUIRED_ERROR,
  archiveHasLiveUsage,
  asDevelopmentStatus,
  composeSkillPrompt,
  firstReadyBlocker,
  isArchivedTraining,
  skillPromptFields,
  skillPromptIsComplete,
  trainingDevelopmentChecklist,
} from "../lib/admin/development";
import {
  checkinQuestionsFor,
  hasHardcodedSkillPack,
  parseSkillPrompt,
  sessionAction,
} from "../lib/father/session-questions";
import { isTrainingAssignable, type Session, type Training } from "../lib/father/types";

const FILM = "https://youtu.be/dQw4w9WgXcQ";

function training(overrides: Partial<Training> = {}): Training {
  return {
    id: "training-1",
    slug: "new-course",
    title: "New Course",
    description: "A skill training.",
    session_count: 1,
    order_index: 0,
    previewed_at: "2026-08-18T12:00:00.000Z",
    development_status: "in_development",
    ...overrides,
  };
}

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-1",
    training_id: "training-1",
    session_number: 1,
    title: "Session one",
    keyline: "Show up.",
    video_url: FILM,
    order_index: 1,
    duration_seconds: 180,
    checkin_prompt: composeSkillPrompt({
      stem: "What did the film teach?",
      a: "A private feeling",
      b: "A concrete skill",
      c: "A substitute habit",
    }),
    action_prompt: composeSkillPrompt({
      stem: "Which action matches the skill?",
      a: "The named behavior",
      b: "A journal entry",
      c: "Skipping the practice",
    }),
    ...overrides,
  };
}

describe("training development prompts", () => {
  it("round-trips a composed Check-in through parseSkillPrompt", () => {
    const composed = composeSkillPrompt({
      stem: "What is the required sequence?",
      a: "Action, then Film",
      b: "Film, then Check-in, then Action",
      c: "Check-in only",
    });
    assert.ok(composed);
    assert.equal(skillPromptIsComplete(composed), true);
    const fields = skillPromptFields(composed);
    assert.equal(fields.stem, "What is the required sequence?");
    assert.equal(fields.b, "Film, then Check-in, then Action");
    const parsed = parseSkillPrompt(composed);
    assert.equal(parsed.choices?.length, 3);
  });

  it("allows an incomplete prompt to be saved", () => {
    const partial = composeSkillPrompt({
      stem: "Still drafting this question",
      a: "",
      b: "",
      c: "",
    });
    assert.equal(partial, "Still drafting this question");
    assert.equal(skillPromptIsComplete(partial), false);
  });

  it("prefers authored prompts over Fundamentals copy", () => {
    const authored = session({
      session_number: 1,
      title: "Training Overview",
      checkin_prompt: composeSkillPrompt({
        stem: "Authored check-in?",
        a: "Yes",
        b: "No",
        c: "Later",
      }),
      action_prompt: null,
    });
    const packTraining = { slug: "fundamentals" };
    assert.equal(hasHardcodedSkillPack(authored, packTraining), true);
    assert.match(checkinQuestionsFor(authored, packTraining)[0].label, /Authored check-in/);
    assert.match(sessionAction(authored, packTraining), /Check-in in this training/);
  });

  it("does not throw when a session has no title yet", () => {
    assert.equal(
      hasHardcodedSkillPack({ session_number: 99, title: null as unknown as string }),
      false
    );
  });

  it("keeps Fundamentals copy when prompts are empty", () => {
    const live = session({
      session_number: 2,
      title: "First Secret: Commitment",
      checkin_prompt: null,
      action_prompt: null,
    });
    assert.match(checkinQuestionsFor(live, { slug: "fundamentals" })[0].label, /what is commitment/);
  });
});

describe("training development checklist", () => {
  it("is ready when sessions, films, questions, runtime, and preview are present", () => {
    const row = { ...training(), sessions: [session()] };
    const checklist = trainingDevelopmentChecklist(row);
    assert.equal(checklist.ready, true);
    assert.equal(checklist.firstMissing, null);
    assert.equal(firstReadyBlocker(row), null);
  });

  it("names the first missing Check-in on a custom training", () => {
    const row = {
      ...training({ previewed_at: "2026-08-18T12:00:00.000Z" }),
      sessions: [session({ checkin_prompt: "Draft stem only" })],
    };
    assert.equal(
      trainingDevelopmentChecklist(row).firstMissing,
      "Session 1 needs a Check-in question with three options."
    );
  });

  it("requires a Stage walk before Ready", () => {
    const row = { ...training({ previewed_at: null }), sessions: [session()] };
    assert.equal(trainingDevelopmentChecklist(row).firstMissing, PREVIEW_REQUIRED_ERROR);
    assert.equal(firstReadyBlocker(row), PREVIEW_REQUIRED_ERROR);
  });

  it("treats a missing title or slug as not ready instead of throwing", () => {
    const row = {
      ...training({ title: null as unknown as string, slug: null as unknown as string }),
      sessions: [session()],
    };
    const checklist = trainingDevelopmentChecklist(row);
    assert.equal(checklist.ready, false);
    assert.equal(checklist.items.find((item) => item.key === "identity")?.done, false);
    assert.equal(checklist.firstMissing, "Add a title and slug.");
  });

  it("lets Fundamentals pass without authored prompts", () => {
    const row = {
      ...training({ slug: "fundamentals", title: "Fathering Fundamentals" }),
      sessions: [
        session({
          title: "Training Overview",
          checkin_prompt: null,
          action_prompt: null,
        }),
      ],
    };
    assert.equal(trainingDevelopmentChecklist(row).ready, true);
  });
});

describe("archive and release gates", () => {
  it("treats unknown development_status as draft", () => {
    assert.equal(asDevelopmentStatus(null), "draft");
    assert.equal(isArchivedTraining({}), false);
    assert.equal(isArchivedTraining({ development_status: "archived" }), true);
  });

  it("archives without unpublishing when Fathers already have progress", () => {
    assert.equal(
      archiveHasLiveUsage({
        assignmentCount: 0,
        progressCount: 2,
        certificateCount: 0,
      }),
      true
    );
    assert.equal(
      archiveHasLiveUsage({
        assignmentCount: 0,
        progressCount: 0,
        certificateCount: 0,
      }),
      false
    );
  });

  it("keeps Leader assignability independent of archive status", () => {
    assert.equal(
      isTrainingAssignable(
        {
          published: true,
          released_at: "2026-08-01T00:00:00.000Z",
        },
        "accepted"
      ),
      true
    );
    assert.equal(ARCHIVE_RELEASE_ERROR.includes("archive"), true);
    assert.equal(READY_REQUIRED_ERROR.includes("Ready"), true);
  });
});

describe("admin training usage query", () => {
  it("counts reviews by group_id because the table has no id column", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../lib/admin/data.ts", import.meta.url)),
      "utf8"
    );
    const usage = source.slice(source.indexOf("export async function loadTrainingUsage"));
    const reviews = usage.slice(usage.indexOf('from("organization_training_reviews")'));
    const reviewsSelect = reviews.slice(0, reviews.indexOf(".eq("));
    assert.match(reviewsSelect, /\.select\("group_id"/);
    assert.equal(reviewsSelect.includes('.select("id"'), false);
  });
});
