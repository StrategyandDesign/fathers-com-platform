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
  STEADY_PRESENCE_ASSESSMENT_KEY,
  STEADY_PRESENCE_TITLE,
  steadyPresenceInstrument,
} from "../lib/assessments/instruments/steady-presence";
import { organizationMayOfferAssessment } from "../lib/assessments/reviews";

function answersWithValue(value: number) {
  return sampleAnswers(steadyPresenceInstrument, value);
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
  const result = evaluateInstrument(steadyPresenceInstrument, answers);
  assert.equal(result.total, total);
  return result;
}

describe("Steady Presence Keystone Assessment", () => {
  it("compiles 30 A/B/C/D items onto the Super-admin catalog", () => {
    assert.equal(steadyPresenceInstrument.items.length, 30);
    assert.equal(
      steadyPresenceInstrument.items.every((item) => item.choices?.length === 4),
      true
    );
    assert.equal(isFirstPartyAssessmentKey(STEADY_PRESENCE_ASSESSMENT_KEY), true);
    assert.equal(
      listFirstPartyAssessments().some((row) => row.title === STEADY_PRESENCE_TITLE),
      true
    );
    const item = firstPartyDeskItem(getFirstPartyAssessment(STEADY_PRESENCE_ASSESSMENT_KEY)!, {
      releasedAt: null,
      firstReleasedAt: null,
      releaseTargets: [],
    });
    assert.equal(item.title, STEADY_PRESENCE_TITLE);
    assert.equal(item.questionCount, 30);
    assert.equal(item.actionLabel, "Release");
    assert.equal(item.kindLabel, "Platform assessment");
    assert.equal(item.href, "/admin/assessments/steady-presence");
  });

  it("maps all A answers to Keystone Presence and all D answers to Blueprint Stage", () => {
    const high = evaluateInstrument(steadyPresenceInstrument, answersWithValue(4));
    const low = evaluateInstrument(steadyPresenceInstrument, answersWithValue(1));
    assert.equal(high.total, 120);
    assert.equal(high.outcomeLabel, "Keystone Presence");
    assert.match(high.outcomeDescription ?? "", /reliable center of gravity/);
    assert.equal(low.total, 30);
    assert.equal(low.outcomeLabel, "Blueprint Stage");
    assert.match(low.outcomeDescription ?? "", /Presence is still intermittent/);
  });

  it("uses the exact raw-score band edges", () => {
    assert.equal(scoreAt(64).outcomeLabel, "Blueprint Stage");
    assert.equal(scoreAt(65).outcomeLabel, "Emerging Steadiness");
    assert.equal(scoreAt(84).outcomeLabel, "Emerging Steadiness");
    assert.equal(scoreAt(85).outcomeLabel, "Reliable Anchor");
    assert.equal(scoreAt(104).outcomeLabel, "Reliable Anchor");
    assert.equal(scoreAt(105).outcomeLabel, "Keystone Presence");
  });

  it("stays out of Leader review until Super-admin releases it", () => {
    assert.equal(
      organizationMayOfferAssessment({
        assessmentKey: STEADY_PRESENCE_ASSESSMENT_KEY,
        release: null,
        reviewStatus: null,
      }),
      false
    );
    assert.equal(
      organizationMayOfferAssessment({
        assessmentKey: STEADY_PRESENCE_ASSESSMENT_KEY,
        release: {
          assessment_key: STEADY_PRESENCE_ASSESSMENT_KEY,
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
        assessmentKey: STEADY_PRESENCE_ASSESSMENT_KEY,
        release: {
          assessment_key: STEADY_PRESENCE_ASSESSMENT_KEY,
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
