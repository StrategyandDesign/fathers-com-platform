import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { firstPartyDeskItem } from "../lib/admin/assessment-desk";
import {
  getFirstPartyAssessment,
  isFirstPartyAssessmentKey,
  listFirstPartyAssessments,
} from "../lib/assessments/first-party";
import { evaluateInstrument, sampleAnswers } from "../lib/assessments/instrument";
import {
  FAMILY_FORTRESS_ASSESSMENT_KEY,
  FAMILY_FORTRESS_TITLE,
  familyFortressInstrument,
} from "../lib/assessments/instruments/family-fortress";
import { organizationMayOfferAssessment } from "../lib/assessments/reviews";

function answersWithValue(value: number) {
  return sampleAnswers(familyFortressInstrument, value);
}

function scoreAt(total: number) {
  const answers = answersWithValue(1);
  let extra = total - 30;
  for (const id of Object.keys(answers)) {
    if (extra <= 0) break;
    const add = Math.min(3, extra);
    answers[id] = 1 + add;
    extra -= add;
  }
  const result = evaluateInstrument(familyFortressInstrument, answers);
  assert.equal(result.total, total);
  return result;
}

describe("Family Fortress Keystone Assessment", () => {
  it("compiles 30 A/B/C/D items onto the Super-admin catalog", () => {
    assert.equal(familyFortressInstrument.items.length, 30);
    assert.equal(
      familyFortressInstrument.items.every((item) => item.choices?.length === 4),
      true
    );
    assert.equal(isFirstPartyAssessmentKey(FAMILY_FORTRESS_ASSESSMENT_KEY), true);
    assert.equal(
      listFirstPartyAssessments().some((row) => row.title === FAMILY_FORTRESS_TITLE),
      true
    );
    const item = firstPartyDeskItem(getFirstPartyAssessment(FAMILY_FORTRESS_ASSESSMENT_KEY)!, {
      releasedAt: null,
      firstReleasedAt: null,
      releaseTargets: [],
    });
    assert.equal(item.title, FAMILY_FORTRESS_TITLE);
    assert.equal(item.questionCount, 30);
    assert.equal(item.actionLabel, "Desk");
    assert.equal(item.kindLabel, "Platform assessment");
    assert.equal(item.href, "/admin/assessments/family-fortress");
  });

  it("maps all A answers to Keystone Fortress and all D answers to Blueprint Stage", () => {
    const high = evaluateInstrument(familyFortressInstrument, answersWithValue(4));
    const low = evaluateInstrument(familyFortressInstrument, answersWithValue(1));
    assert.equal(high.total, 120);
    assert.equal(high.outcomeLabel, "Keystone Fortress");
    assert.match(high.outcomeDescription ?? "", /structures are real/);
    assert.equal(low.total, 30);
    assert.equal(low.outcomeLabel, "Blueprint Stage");
    assert.match(low.outcomeDescription ?? "", /Security is still mostly aspiration/);
  });

  it("uses the exact raw-score band edges", () => {
    assert.equal(scoreAt(64).outcomeLabel, "Blueprint Stage");
    assert.equal(scoreAt(65).outcomeLabel, "Rising Foundation");
    assert.equal(scoreAt(84).outcomeLabel, "Rising Foundation");
    assert.equal(scoreAt(85).outcomeLabel, "Solid Walls");
    assert.equal(scoreAt(104).outcomeLabel, "Solid Walls");
    assert.equal(scoreAt(105).outcomeLabel, "Keystone Fortress");
  });

  it("stays out of Leader review until Super-admin releases it", () => {
    assert.equal(
      organizationMayOfferAssessment({
        assessmentKey: FAMILY_FORTRESS_ASSESSMENT_KEY,
        release: null,
        reviewStatus: null,
      }),
      false
    );
    assert.equal(
      organizationMayOfferAssessment({
        assessmentKey: FAMILY_FORTRESS_ASSESSMENT_KEY,
        release: {
          assessment_key: FAMILY_FORTRESS_ASSESSMENT_KEY,
          released_at: "2026-08-21T00:00:00Z",
          first_released_at: "2026-08-21T00:00:00Z",
          released_by: "admin",
        },
        reviewStatus: "pending",
      }),
      false
    );
    assert.equal(
      organizationMayOfferAssessment({
        assessmentKey: FAMILY_FORTRESS_ASSESSMENT_KEY,
        release: {
          assessment_key: FAMILY_FORTRESS_ASSESSMENT_KEY,
          released_at: "2026-08-21T00:00:00Z",
          first_released_at: "2026-08-21T00:00:00Z",
          released_by: "admin",
        },
        reviewStatus: "accepted",
      }),
      true
    );
  });
});
