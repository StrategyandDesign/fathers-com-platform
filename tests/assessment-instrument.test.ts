import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assessmentKeyFromTitle,
  assessmentSlugFromTitle,
  compileInstrument,
  evaluateInstrument,
  sampleAnswers,
} from "../lib/assessments/instrument";

const QUESTIONS = [
  "Involvement | I stay in my child's life",
  "Involvement | - I wait for them to reach me first",
  "Presence | When we talk, I give them my attention",
].join("\n");

describe("researcher instrument scoring", () => {
  it("compiles Dimension | prompt lines and reverse-keyed items", () => {
    const compiled = compileInstrument(QUESTIONS, "method: sum\nscale: 1-5\noutcome: highest");
    assert.equal(compiled.ok, true);
    if (!compiled.ok) return;
    assert.equal(compiled.value.items.length, 3);
    assert.equal(compiled.value.items[1].coding, -1);
    assert.equal(compiled.value.scoring.dimensions.length, 2);
  });

  it("picks the highest dimension after reverse coding", () => {
    const compiled = compileInstrument(
      QUESTIONS,
      [
        "method: sum",
        "scale: 1-5",
        "outcome: highest",
        "Involvement: You stay in their life",
        "Presence: You give them your attention",
      ].join("\n")
    );
    assert.equal(compiled.ok, true);
    if (!compiled.ok) return;

    const highInvolvement = evaluateInstrument(compiled.value, {
      "involvement-1": 5,
      "involvement-2": 1,
      "presence-3": 2,
    });
    assert.equal(highInvolvement.outcomeKey, "involvement");
    assert.equal(highInvolvement.outcomeLabel, "You stay in their life");

    const highPresence = evaluateInstrument(compiled.value, {
      "involvement-1": 1,
      "involvement-2": 5,
      "presence-3": 5,
    });
    assert.equal(highPresence.outcomeKey, "presence");
  });

  it("maps a percent into researcher-supplied bands", () => {
    const compiled = compileInstrument(
      "Contact | I reach out this week\nContact | I write even when I have little to say",
      ["method: mean", "scale: 1-5", "outcome: bands Contact", "0-39 Distant", "40-69 Steady", "70-100 Close"].join(
        "\n"
      )
    );
    assert.equal(compiled.ok, true);
    if (!compiled.ok) return;
    const low = evaluateInstrument(compiled.value, sampleAnswers(compiled.value, 1));
    const high = evaluateInstrument(compiled.value, sampleAnswers(compiled.value, 5));
    assert.equal(low.outcomeLabel, "Distant");
    assert.equal(high.outcomeLabel, "Close");
  });

  it("rejects a question with no dimension", () => {
    const compiled = compileInstrument("I stay nearby", "");
    assert.equal(compiled.ok, false);
  });

  it("defaults an empty scoring key to a 1-5 sum and the highest dimension", () => {
    const compiled = compileInstrument(QUESTIONS, "");
    assert.equal(compiled.ok, true);
    if (!compiled.ok) return;
    assert.equal(compiled.value.scoring.method, "sum_coded");
    assert.deepEqual(compiled.value.scoring.scale, { min: 1, max: 5 });
    assert.equal(compiled.value.scoring.outcome.kind, "highest_dimension");
  });

  it("keeps catalog keys off the reserved Keystone slug", () => {
    assert.equal(assessmentKeyFromTitle("Keystone"), "keystone-instrument");
    assert.equal(assessmentSlugFromTitle("Keystone"), "scale-keystone");
    assert.equal(assessmentSlugFromTitle("A"), "scale-a");
    assert.ok(assessmentSlugFromTitle("Presence Scale").length <= 32);
  });
});
