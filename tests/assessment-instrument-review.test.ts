import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { getFirstPartyAssessment } from "../lib/assessments/first-party";
import {
  firstPartyInstrumentReview,
  keystoneInstrumentReview,
} from "../lib/assessments/instrument-review";
import { PROFILE_QUESTION_COUNT, PROFILE_SCALE } from "../lib/father/questions";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("leader assessment instrument review", () => {
  it("lists every Family Fortress question with A through D", () => {
    const assessment = getFirstPartyAssessment("family-fortress");
    assert.ok(assessment);
    const model = firstPartyInstrumentReview(assessment);
    assert.equal(model.questionCount, 30);
    assert.equal(model.questions.length, 30);
    assert.equal(model.sharedScale, null);
    assert.ok(model.copy?.introduction);
    assert.ok(model.bands.length >= 4);
    assert.equal(
      model.questions.every((question) => question.choices.map((choice) => choice.key).join("") === "ABCD"),
      true
    );
    assert.ok(model.questions[0]?.prompt);
    assert.ok(model.questions[0]?.choices[0]?.label);
  });

  it("lists every Keystone question and the shared five-point scale", () => {
    const model = keystoneInstrumentReview();
    assert.equal(model.questionCount, PROFILE_QUESTION_COUNT);
    assert.equal(model.questions.length, PROFILE_QUESTION_COUNT);
    assert.deepEqual(
      model.sharedScale?.map((choice) => choice.label),
      PROFILE_SCALE.map((entry) => entry.label)
    );
    assert.equal(model.questions[0]?.choices.length, 0);
    assert.match(model.questions[0]?.prompt ?? "", /I make time to be with my child/);
  });

  it("puts the instrument on Leader View and Review desks", () => {
    const desk = readRepo("components/manager/platform-assessment-desk.tsx");
    const keystone = readRepo("app/(manager)/manager/assessments/keystone/page.tsx");
    const review = readRepo("app/(manager)/manager/assessment-reviews/[assessmentKey]/page.tsx");
    const keystoneReview = readRepo("app/(manager)/manager/assessment-reviews/keystone/page.tsx");
    const catalog = readRepo("lib/assessments/catalog.ts");
    assert.match(desk, /AssessmentInstrumentReview/);
    assert.match(desk, /firstPartyInstrumentReview/);
    assert.match(keystone, /keystoneInstrumentReview/);
    assert.match(review, /AssessmentInstrumentReview/);
    assert.match(keystoneReview, /keystoneInstrumentReview/);
    assert.match(catalog, /#instrument/);
  });
});
