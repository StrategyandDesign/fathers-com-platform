import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  countSkillsUsed,
  nextSkillUse,
  parseSkillUse,
  pickSkillUseFollowUp,
  skillUseFollowUpDue,
} from "../lib/father/skill-use";

describe("skill use parse", () => {
  it("accepts used, later, and dismissed", () => {
    assert.equal(parseSkillUse("used"), "used");
    assert.equal(parseSkillUse("later"), "later");
    assert.equal(parseSkillUse("dismissed"), "dismissed");
    assert.equal(parseSkillUse("completed"), null);
    assert.equal(parseSkillUse(null), null);
  });

  it("does not let used fall back to later or dismissed", () => {
    assert.equal(nextSkillUse("used", "later"), "used");
    assert.equal(nextSkillUse("used", "dismissed"), "used");
    assert.equal(nextSkillUse("later", "used"), "used");
    assert.equal(nextSkillUse("dismissed", "used"), "used");
    assert.equal(nextSkillUse(null, "later"), "later");
    assert.equal(nextSkillUse(null, "dismissed"), "dismissed");
  });
});

describe("skill use follow-up", () => {
  const now = new Date("2026-08-19T18:00:00.000Z");

  it("waits twelve hours after completion before Home asks", () => {
    assert.equal(skillUseFollowUpDue("2026-08-19T10:00:00.000Z", now), false);
    assert.equal(skillUseFollowUpDue("2026-08-19T05:00:00.000Z", now), true);
    assert.equal(skillUseFollowUpDue(null, now), true);
  });

  it("picks the most recent unanswered completed session", () => {
    const prompt = pickSkillUseFollowUp(
      [
        {
          sessionId: "old",
          sessionTitle: "Session 1",
          skill: "Stay calm",
          completedAt: "2026-08-17T12:00:00.000Z",
          skillUse: null,
        },
        {
          sessionId: "new",
          sessionTitle: "Session 2",
          skill: "Listen first",
          completedAt: "2026-08-18T12:00:00.000Z",
          skillUse: null,
        },
        {
          sessionId: "fresh",
          sessionTitle: "Session 3",
          skill: "Show up",
          completedAt: "2026-08-19T12:00:00.000Z",
          skillUse: null,
        },
      ],
      now
    );
    assert.equal(prompt?.sessionId, "new");
    assert.equal(prompt?.skill, "Listen first");
  });

  it("skips sessions already answered", () => {
    const prompt = pickSkillUseFollowUp(
      [
        {
          sessionId: "used",
          sessionTitle: "Session 2",
          skill: "Listen first",
          completedAt: "2026-08-18T12:00:00.000Z",
          skillUse: "used",
        },
        {
          sessionId: "later",
          sessionTitle: "Session 1",
          skill: "Stay calm",
          completedAt: "2026-08-17T12:00:00.000Z",
          skillUse: "later",
        },
        {
          sessionId: "dismissed",
          sessionTitle: "Session 3",
          skill: "Show up",
          completedAt: "2026-08-16T12:00:00.000Z",
          skillUse: "dismissed",
        },
      ],
      now
    );
    assert.equal(prompt, null);
  });
});

describe("skills used count", () => {
  it("counts only used, never later, dismissed, or blank", () => {
    assert.equal(
      countSkillsUsed([
        { skill_use: "used" },
        { skill_use: "later" },
        { skill_use: "dismissed" },
        { skill_use: null },
        { skillUse: "used" },
      ]),
      2
    );
  });
});

describe("skill use card", () => {
  it("offers Completed, Not yet, and Dismiss on one unselected row", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../components/father/skill-use-card.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(source, /skillUseCompleted/);
    assert.match(source, /skillUseLater/);
    assert.match(source, /skillUseDismiss/);
    assert.match(source, /flex flex-row flex-wrap items-center gap-2/);
    assert.match(source, /variant="outline"/);
    assert.match(source, /setHidden\(true\)/);
    assert.doesNotMatch(source, /skillUseMarked/);
    assert.doesNotMatch(source, /showLater/);
  });
});
