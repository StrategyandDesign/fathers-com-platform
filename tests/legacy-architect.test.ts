import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  firstPartyDeskItem,
} from "../lib/admin/assessment-desk";
import {
  getFirstPartyAssessment,
  isFirstPartyAssessmentKey,
  listFirstPartyAssessments,
} from "../lib/assessments/first-party";
import { evaluateInstrument, sampleAnswers } from "../lib/assessments/instrument";
import {
  LEGACY_ARCHITECT_ASSESSMENT_KEY,
  LEGACY_ARCHITECT_TITLE,
  legacyArchitectInstrument,
} from "../lib/assessments/instruments/legacy-architect";
import {
  organizationMayOfferAssessment,
} from "../lib/assessments/reviews";

function answersWithValue(value: number) {
  return sampleAnswers(legacyArchitectInstrument, value);
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
  const result = evaluateInstrument(legacyArchitectInstrument, answers);
  assert.equal(result.total, total);
  return result;
}

describe("Legacy Architect Keystone Assessment", () => {
  it("compiles 30 A/B/C/D items onto the Super-admin catalog", () => {
    assert.equal(legacyArchitectInstrument.items.length, 30);
    assert.equal(
      legacyArchitectInstrument.items.every((item) => item.choices?.length === 4),
      true
    );
    assert.equal(isFirstPartyAssessmentKey(LEGACY_ARCHITECT_ASSESSMENT_KEY), true);
    assert.equal(
      listFirstPartyAssessments().some((row) => row.title === LEGACY_ARCHITECT_TITLE),
      true
    );
    const item = firstPartyDeskItem(getFirstPartyAssessment(LEGACY_ARCHITECT_ASSESSMENT_KEY)!, {
      releasedAt: null,
      firstReleasedAt: null,
      releaseTargets: [],
    });
    assert.equal(item.title, LEGACY_ARCHITECT_TITLE);
    assert.equal(item.questionCount, 30);
    assert.equal(item.actionLabel, "Desk");
    assert.equal(item.kindLabel, "Platform assessment");
    assert.equal(item.href, "/admin/assessments/legacy-architect");
  });

  it("maps all A answers to Keystone Architect and all D answers to Blueprint Stage", () => {
    const high = evaluateInstrument(legacyArchitectInstrument, answersWithValue(4));
    const low = evaluateInstrument(legacyArchitectInstrument, answersWithValue(1));
    assert.equal(high.total, 120);
    assert.equal(high.outcomeLabel, "Keystone Architect");
    assert.match(high.outcomeDescription ?? "", /deliberately constructing/);
    assert.equal(low.total, 30);
    assert.equal(low.outcomeLabel, "Blueprint Stage");
    assert.match(low.outcomeDescription ?? "", /architecture is still mostly on paper/);
  });

  it("uses the exact raw-score band edges", () => {
    assert.equal(scoreAt(64).outcomeLabel, "Blueprint Stage");
    assert.equal(scoreAt(65).outcomeLabel, "Foundation Layer");
    assert.equal(scoreAt(84).outcomeLabel, "Foundation Layer");
    assert.equal(scoreAt(85).outcomeLabel, "Cornerstone Builder");
    assert.equal(scoreAt(104).outcomeLabel, "Cornerstone Builder");
    assert.equal(scoreAt(105).outcomeLabel, "Keystone Architect");
  });

  it("stays out of Leader review until Super-admin releases it", () => {
    assert.equal(
      organizationMayOfferAssessment({
        assessmentKey: LEGACY_ARCHITECT_ASSESSMENT_KEY,
        release: null,
        reviewStatus: null,
      }),
      false
    );
    assert.equal(
      organizationMayOfferAssessment({
        assessmentKey: LEGACY_ARCHITECT_ASSESSMENT_KEY,
        release: {
          assessment_key: LEGACY_ARCHITECT_ASSESSMENT_KEY,
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
        assessmentKey: LEGACY_ARCHITECT_ASSESSMENT_KEY,
        release: {
          assessment_key: LEGACY_ARCHITECT_ASSESSMENT_KEY,
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
