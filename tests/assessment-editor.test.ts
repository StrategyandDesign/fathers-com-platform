import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { firstPartyDeskItem } from "../lib/admin/assessment-desk";
import { getFirstPartyAssessment } from "../lib/assessments/first-party";
import {
  applyFirstPartyEditorIntent,
  compileFirstPartyDraft,
  draftFromFirstParty,
  firstPartyScoreRange,
  overlayFirstPartyAssessment,
  parseStoredFirstPartyInstrument,
  storedInstrumentPayload,
} from "../lib/assessments/first-party-catalog";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

function formDataFromDraft(
  draft: ReturnType<typeof draftFromFirstParty>,
  extra: Record<string, string> = {}
) {
  const data = new FormData();
  data.set("title", draft.title);
  data.set("description", draft.description);
  data.set("introduction", draft.copy.introduction);
  data.set("purpose", draft.copy.purpose);
  data.set("goal", draft.copy.goal);
  data.set("honest_hint", draft.copy.honestHint);
  data.set("question_count", String(draft.items.length));
  data.set("band_count", String(draft.bands.length));
  draft.items.forEach((item, index) => {
    data.set(`q_${index}_id`, item.id);
    data.set(`q_${index}_prompt`, item.prompt);
    data.set(`q_${index}_a`, item.a);
    data.set(`q_${index}_b`, item.b);
    data.set(`q_${index}_c`, item.c);
    data.set(`q_${index}_d`, item.d);
  });
  draft.bands.forEach((band, index) => {
    data.set(`band_${index}_min`, String(band.min));
    data.set(`band_${index}_max`, String(band.max));
    data.set(`band_${index}_label`, band.label);
    data.set(`band_${index}_description`, band.description);
  });
  for (const [key, value] of Object.entries(extra)) data.set(key, value);
  return data;
}

describe("first-party assessment editor", () => {
  it("overlays a saved title, copy, and question on the seed", () => {
    const seed = getFirstPartyAssessment("legacy-architect");
    assert.ok(seed);
    const draft = draftFromFirstParty(seed);
    draft.title = "Legacy Architect, revised";
    draft.copy.goal = "Name the next move.";
    draft.items[0].prompt = "Rewritten first question";
    const compiled = compileFirstPartyDraft(seed, draft, { requireComplete: true });
    assert.equal(compiled.ok, true);
    if (!compiled.ok) return;
    const overlaid = overlayFirstPartyAssessment(seed, {
      title: compiled.assessment.title,
      description: compiled.assessment.description,
      instrument: storedInstrumentPayload(compiled.assessment),
    });
    assert.equal(overlaid.title, "Legacy Architect, revised");
    assert.equal(overlaid.copy.goal, "Name the next move.");
    assert.equal(overlaid.instrument.items[0]?.prompt, "Rewritten first question");
    assert.equal(overlaid.questionCount, 30);
  });

  it("rejects a save when a designation leaves a score gap", () => {
    const seed = getFirstPartyAssessment("legacy-architect");
    assert.ok(seed);
    const draft = draftFromFirstParty(seed);
    draft.bands[0].min = 110;
    const compiled = compileFirstPartyDraft(seed, draft, { requireComplete: true });
    assert.equal(compiled.ok, false);
    if (compiled.ok) return;
    assert.match(compiled.error, /gaps or overlap|end at/);
  });

  it("rejects a save when a prompt is empty", () => {
    const seed = getFirstPartyAssessment("family-fortress");
    assert.ok(seed);
    const draft = draftFromFirstParty(seed);
    draft.items[2].prompt = "   ";
    const compiled = compileFirstPartyDraft(seed, draft, { requireComplete: true });
    assert.equal(compiled.ok, false);
    if (compiled.ok) return;
    assert.match(compiled.error, /question 3/);
  });

  it("adds a question and stretches the top score", () => {
    const seed = getFirstPartyAssessment("steady-presence");
    assert.ok(seed);
    const draft = draftFromFirstParty(seed);
    const next = applyFirstPartyEditorIntent(draft, formDataFromDraft(draft, { intent: "add_question" }), seed);
    assert.equal(next.items.length, 31);
    const range = firstPartyScoreRange(31);
    const top = Math.max(...next.bands.map((band) => band.max));
    assert.equal(top, range.max);
  });

  it("ignores stored JSON that is not a complete choice instrument", () => {
    const seed = getFirstPartyAssessment("legacy-architect");
    assert.ok(seed);
    assert.equal(parseStoredFirstPartyInstrument({ items: [] }, seed), null);
    assert.equal(parseStoredFirstPartyInstrument({ items: [{ id: "x" }] }, seed), null);
    const overlaid = overlayFirstPartyAssessment(seed, {
      title: "Kept title",
      instrument: { version: "1.0.0" },
    });
    assert.equal(overlaid.title, "Kept title");
    assert.equal(overlaid.instrument.items.length, 30);
  });

  it("opens the first-party desk instead of jumping to Release", () => {
    const assessment = getFirstPartyAssessment("legacy-architect");
    assert.ok(assessment);
    const item = firstPartyDeskItem(assessment, {
      releasedAt: null,
      firstReleasedAt: null,
      releaseTargets: [],
    });
    assert.equal(item.actionLabel, "Desk");
    assert.equal(item.actionHref, "/admin/assessments/legacy-architect");
    const page = readRepo("app/(admin)/admin/assessments/[assessmentKey]/page.tsx");
    const form = readRepo("components/admin/assessment-authoring-form.tsx");
    const preview = readRepo("app/(admin)/admin/assessments/[assessmentKey]/preview/page.tsx");
    const actions = readRepo("lib/admin/assessment-edit-actions.ts");
    assert.match(page, /AssessmentAuthoringForm/);
    assert.match(page, /firstPartyAdminPreviewPath/);
    assert.match(form, /saveFirstPartyAssessment/);
    assert.match(form, /q_\$\{index\}_prompt/);
    assert.match(preview, /preview/);
    assert.match(actions, /requireRole\("admin"\)/);
    assert.match(actions, /instrument: storedInstrumentPayload/);
  });
});
