import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countSkillsUsed,
  nextSkillUse,
  parseSkillUse,
  pickSkillUseFollowUp,
  skillUseFollowUpDue,
} from "../lib/father/skill-use";

describe("skill use parse", () => {
  it("accepts only used and later", () => {
    assert.equal(parseSkillUse("used"), "used");
    assert.equal(parseSkillUse("later"), "later");
    assert.equal(parseSkillUse("completed"), null);
    assert.equal(parseSkillUse(null), null);
  });

  it("does not let used fall back to later", () => {
    assert.equal(nextSkillUse("used", "later"), "used");
    assert.equal(nextSkillUse("later", "used"), "used");
    assert.equal(nextSkillUse(null, "later"), "later");
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
      ],
      now
    );
    assert.equal(prompt, null);
  });
});

describe("skills used count", () => {
  it("counts only used, never later or blank", () => {
    assert.equal(
      countSkillsUsed([
        { skill_use: "used" },
        { skill_use: "later" },
        { skill_use: null },
        { skillUse: "used" },
      ]),
      2
    );
  });
});
