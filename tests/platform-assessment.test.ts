import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assessmentSlugify,
  bandsCoverScale,
  defaultInstrumentDraft,
  isAuthoredPlatformAssessmentKey,
  likertToPercent,
  parseAssessmentSlug,
  parseInstrumentDraft,
  platformAssessmentChecklist,
  platformAssessmentKeyFromSlug,
  scoreInstrument,
  weightedMean,
} from "../lib/admin/platform-assessments";
import { fatherCanStartAssessment as canStart } from "../lib/assessments/availability";
import {
  buildManagerAssessmentCatalog,
  partitionAssessmentCatalog,
} from "../lib/assessments/catalog";
import { organizationMayOfferAssessment } from "../lib/assessments/reviews";

describe("platform assessment keys", () => {
  it("builds an 8+ character release key from a slug", () => {
    assert.equal(platformAssessmentKeyFromSlug("hope"), "plat_hope");
    assert.equal(isAuthoredPlatformAssessmentKey("plat_hope"), true);
    assert.equal(isAuthoredPlatformAssessmentKey("keystone"), false);
    assert.equal(isAuthoredPlatformAssessmentKey("not-a-key"), false);
  });

  it("rejects reserved and short slugs", () => {
    assert.equal(assessmentSlugify("Keystone"), "");
    assert.equal(parseAssessmentSlug("ab").ok, false);
    assert.equal(parseAssessmentSlug("presence-check").ok, true);
  });
});

describe("weighted scoring", () => {
  it("normalizes Likert answers and reverses them", () => {
    assert.equal(likertToPercent(5, false), 100);
    assert.equal(likertToPercent(1, false), 0);
    assert.equal(likertToPercent(1, true), 100);
    assert.equal(likertToPercent(5, true), 0);
    assert.equal(likertToPercent(3, false), 50);
  });

  it("weights domains independently, then the overall mean", () => {
    const scored = scoreInstrument({
      domains: [
        {
          id: "presence",
          key: "presence",
          title: "Presence",
          weight: 2,
          items: [
            { id: "p1", weight: 1, reverseScored: false },
            { id: "p2", weight: 1, reverseScored: true },
          ],
        },
        {
          id: "repair",
          key: "repair",
          title: "Repair",
          weight: 1,
          items: [{ id: "r1", weight: 1, reverseScored: false }],
        },
      ],
      answers: { p1: 5, p2: 1, r1: 3 },
      bands: [
        { minScore: 0, maxScore: 39, label: "Getting started" },
        { minScore: 40, maxScore: 69, label: "Growing" },
        { minScore: 70, maxScore: 100, label: "Strong" },
      ],
    });

    assert.equal(scored.complete, true);
    assert.equal(scored.domains[0]?.score, 100);
    assert.equal(scored.domains[1]?.score, 50);
    assert.equal(scored.overall, Math.round(((100 * 2 + 50 * 1) / 3) * 10) / 10);
    assert.equal(scored.band?.label, "Strong");
    assert.equal(weightedMean([{ value: 100, weight: 2 }, { value: 50, weight: 1 }]), 250 / 3);
  });
});

describe("instrument draft and checklist", () => {
  it("requires domains, questions, covering bands, and a stage walk", () => {
    const draft = defaultInstrumentDraft();
    draft.domains[0]!.title = "Presence";
    draft.domains[0]!.items[0]!.prompt = "I come home present.";
    const beforePreview = platformAssessmentChecklist({
      title: "Presence Check",
      slug: "presence-check",
      previewed_at: null,
      instrument: draft,
    });
    assert.equal(beforePreview.ready, false);
    assert.match(beforePreview.firstMissing ?? "", /Stage preview/);

    const ready = platformAssessmentChecklist({
      title: "Presence Check",
      slug: "presence-check",
      previewed_at: "2026-08-18T12:00:00Z",
      instrument: draft,
    });
    assert.equal(ready.ready, true);
    assert.equal(bandsCoverScale(draft.bands), true);
  });

  it("rejects an empty instrument", () => {
    const parsed = parseInstrumentDraft({ domains: [], bands: [] });
    assert.equal(typeof parsed, "string");
  });
});

describe("authored platform release gates", () => {
  const key = "plat_presence-check";
  const release = {
    assessment_key: key,
    released_at: "2026-08-18T12:00:00Z",
    first_released_at: "2026-08-18T12:00:00Z",
    released_by: "admin-1",
  };

  it("keeps a new assessment out of the catalog until it is released", () => {
    assert.equal(
      organizationMayOfferAssessment({
        assessmentKey: key,
        release: null,
        reviewStatus: null,
      }),
      false
    );
    assert.equal(
      canStart({
        rows: [],
        groupIds: ["g1"],
        homeGroupId: "g1",
        assessmentKey: key,
        release: null,
        reviewStatus: null,
      }),
      false
    );
  });

  it("lets a father start only after accept and share", () => {
    assert.equal(
      organizationMayOfferAssessment({
        assessmentKey: key,
        release,
        reviewStatus: "accepted",
      }),
      true
    );
    assert.equal(
      canStart({
        rows: [],
        groupIds: ["g1"],
        homeGroupId: "g1",
        assessmentKey: key,
        release,
        reviewStatus: "accepted",
      }),
      false
    );
    assert.equal(
      canStart({
        rows: [{ group_id: "g1", assessment_key: key, status: "available" }],
        groupIds: ["g1"],
        homeGroupId: "g1",
        assessmentKey: key,
        release,
        reviewStatus: "accepted",
      }),
      true
    );
  });

  it("puts a released authored assessment in Waiting on you", () => {
    const items = buildManagerAssessmentCatalog({
      groups: [{ id: "g1", name: "Returning Home NWA" }],
      custom: [],
      availability: [],
      keystoneCompletedByGroup: {},
      groupSize: { g1: 4 },
      keystoneRelease: {
        assessment_key: "keystone",
        released_at: null,
        first_released_at: "2026-08-18T12:00:00Z",
        released_by: null,
      },
      reviews: [
        {
          group_id: "g1",
          assessment_key: key,
          status: "pending",
          decline_reason: null,
          decided_by: null,
          decided_at: null,
          created_at: "2026-08-18T12:00:00Z",
        },
      ],
      platform: [
        {
          assessmentKey: key,
          title: "Presence Check",
          description: null,
          questionCount: 8,
          completedByGroup: {},
          release,
        },
      ],
    });
    const { pending, available } = partitionAssessmentCatalog(items);
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.kind, "platform");
    assert.equal(available.length, 0);
    assert.match(pending[0]?.href ?? "", /assessment-reviews\/plat_presence-check/);
  });
});
