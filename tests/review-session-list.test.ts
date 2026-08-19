import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { checkinQuestionsFor, parseSkillPrompt } from "../lib/father/session-questions";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("review session list", () => {
  it("keeps audit sessions closed until a leader opens one", () => {
    const page = readRepo("app/(manager)/manager/reviews/[trainingId]/page.tsx");
    const list = readRepo("components/manager/review-session-list.tsx");

    assert.match(page, /ReviewSessionList/);
    assert.doesNotMatch(page, /youtubeEmbedUrl/);
    assert.match(list, /<details/);
    assert.doesNotMatch(list, /<details[^>]*\sopen[\s>]/);
    assert.match(list, /<summary/);
    assert.match(list, /session\.keyline/);
    assert.match(list, /hostedVideoEmbed/);
    assert.match(list, /checkinQuestionsFor/);
    assert.doesNotMatch(list, /SessionCheckinFields/);
    assert.doesNotMatch(list, /<form/);
  });

  it("shows the check-in stem and choices without a form", () => {
    const questions = checkinQuestionsFor(
      { session_number: 1, title: "Training Overview" },
      { slug: "fundamentals" }
    );
    const parsed = parseSkillPrompt(questions[0]?.label ?? "");

    assert.match(parsed.stem, /required sequence/i);
    assert.ok(parsed.choices && parsed.choices.length >= 2);
    assert.equal(parsed.choices[1]?.label.includes("Film"), true);
  });
});
