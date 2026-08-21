import type { FirstPartyAssessment, FirstPartyAssessmentCopy } from "@/lib/assessments/first-party";
import {
  INSTRUMENT_BAND_DESCRIPTION_MAX,
  INSTRUMENT_CHOICE_LABEL_MAX,
  INSTRUMENT_ITEM_MAX,
  INSTRUMENT_PROMPT_MAX,
  buildChoiceSumInstrument,
  isChoiceItem,
  type AssessmentInstrument,
  type OutcomeBand,
} from "@/lib/assessments/instrument";

export const FIRST_PARTY_TITLE_MAX = 200;
export const FIRST_PARTY_DESCRIPTION_MAX = 2000;
export const FIRST_PARTY_COPY_MAX = 2000;
export const FIRST_PARTY_HINT_MAX = 400;
export const FIRST_PARTY_BAND_LABEL_MAX = 80;
export const FIRST_PARTY_BAND_MAX = 12;

const ITEM_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export type FirstPartyCatalogRow = {
  title?: string | null;
  description?: string | null;
  instrument?: unknown;
  lastEditedAt?: string | null;
};

export type FirstPartyEditorItem = {
  id: string;
  prompt: string;
  a: string;
  b: string;
  c: string;
  d: string;
};

export type FirstPartyEditorBand = {
  min: number;
  max: number;
  label: string;
  description: string;
};

export type FirstPartyEditorDraft = {
  title: string;
  description: string;
  copy: FirstPartyAssessmentCopy;
  items: FirstPartyEditorItem[];
  bands: FirstPartyEditorBand[];
};

export type FirstPartyEditorResult =
  | { ok: true; assessment: FirstPartyAssessment }
  | { ok: false; error: string };

export function firstPartyScoreRange(questionCount: number) {
  return { min: questionCount, max: questionCount * 4 };
}

export function draftFromFirstParty(assessment: FirstPartyAssessment): FirstPartyEditorDraft {
  const bands =
    assessment.instrument.scoring.outcome.kind === "bands"
      ? assessment.instrument.scoring.outcome.bands
      : [];
  return {
    title: assessment.title,
    description: assessment.description,
    copy: { ...assessment.copy },
    items: assessment.instrument.items.filter(isChoiceItem).map((item) => ({
      id: item.id,
      prompt: item.prompt,
      a: item.choices.find((choice) => choice.key === "A")?.label ?? "",
      b: item.choices.find((choice) => choice.key === "B")?.label ?? "",
      c: item.choices.find((choice) => choice.key === "C")?.label ?? "",
      d: item.choices.find((choice) => choice.key === "D")?.label ?? "",
    })),
    bands: bands.map((band) => ({
      min: band.min,
      max: band.max,
      label: band.label,
      description: band.description ?? "",
    })),
  };
}

function capped(value: string, max: number) {
  return value.trim().slice(0, max);
}

function asInt(value: unknown) {
  if (value == null || value === "") return NaN;
  const number = Number(value);
  return Number.isInteger(number) ? number : NaN;
}

function dimensionFromSeed(seed: FirstPartyAssessment) {
  const dimension = seed.instrument.scoring.dimensions[0];
  return {
    id: dimension?.id || seed.key.replace(/[^a-z0-9]+/g, "-"),
    label: dimension?.label || "Result",
  };
}

function uniqueItemId(dimensionId: string, index: number, used: Set<string>) {
  let id = `${dimensionId}-${index + 1}`;
  while (used.has(id) || !ITEM_ID.test(id)) {
    id = `${dimensionId}-${index + 1}x${used.size + 1}`;
  }
  used.add(id);
  return id;
}

export function readFirstPartyEditorForm(formData: FormData): FirstPartyEditorDraft {
  const questionCount = Math.min(
    INSTRUMENT_ITEM_MAX,
    Math.max(1, asInt(formData.get("question_count")) || 1)
  );
  const bandCount = Math.min(
    FIRST_PARTY_BAND_MAX,
    Math.max(1, asInt(formData.get("band_count")) || 1)
  );
  const items: FirstPartyEditorItem[] = [];
  for (let index = 0; index < questionCount; index += 1) {
    items.push({
      id: String(formData.get(`q_${index}_id`) ?? "").trim(),
      prompt: String(formData.get(`q_${index}_prompt`) ?? ""),
      a: String(formData.get(`q_${index}_a`) ?? ""),
      b: String(formData.get(`q_${index}_b`) ?? ""),
      c: String(formData.get(`q_${index}_c`) ?? ""),
      d: String(formData.get(`q_${index}_d`) ?? ""),
    });
  }
  const bands: FirstPartyEditorBand[] = [];
  for (let index = 0; index < bandCount; index += 1) {
    bands.push({
      min: asInt(formData.get(`band_${index}_min`)),
      max: asInt(formData.get(`band_${index}_max`)),
      label: String(formData.get(`band_${index}_label`) ?? ""),
      description: String(formData.get(`band_${index}_description`) ?? ""),
    });
  }
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    copy: {
      introduction: String(formData.get("introduction") ?? ""),
      purpose: String(formData.get("purpose") ?? ""),
      goal: String(formData.get("goal") ?? ""),
      honestHint: String(formData.get("honest_hint") ?? ""),
    },
    items,
    bands,
  };
}

export function applyFirstPartyEditorIntent(
  draft: FirstPartyEditorDraft,
  formData: FormData,
  seed: FirstPartyAssessment
): FirstPartyEditorDraft {
  const removeQuestion = asInt(formData.get("remove_question"));
  const removeBand = asInt(formData.get("remove_band"));
  const intent = Number.isInteger(removeQuestion)
    ? "remove_question"
    : Number.isInteger(removeBand)
      ? "remove_band"
      : String(formData.get("intent") ?? "save").trim();
  const dimension = dimensionFromSeed(seed);
  const next: FirstPartyEditorDraft = {
    ...draft,
    copy: { ...draft.copy },
    items: draft.items.map((item) => ({ ...item })),
    bands: draft.bands.map((band) => ({ ...band })),
  };

  if (intent === "add_question" && next.items.length < INSTRUMENT_ITEM_MAX) {
    const used = new Set(next.items.map((item) => item.id).filter(Boolean));
    next.items.push({
      id: uniqueItemId(dimension.id, next.items.length, used),
      prompt: "",
      a: "",
      b: "",
      c: "",
      d: "",
    });
    const range = firstPartyScoreRange(next.items.length);
    next.bands = fitRawBands(next.bands, range.min, range.max);
  }

  if (intent === "remove_question" && next.items.length > 1) {
    if (removeQuestion >= 0 && removeQuestion < next.items.length) {
      next.items.splice(removeQuestion, 1);
      const range = firstPartyScoreRange(next.items.length);
      next.bands = fitRawBands(next.bands, range.min, range.max);
    }
  }

  if (intent === "add_band" && next.bands.length < FIRST_PARTY_BAND_MAX) {
    next.bands.push({ min: NaN, max: NaN, label: "", description: "" });
  }

  if (intent === "remove_band" && next.bands.length > 1) {
    if (removeBand >= 0 && removeBand < next.bands.length) {
      next.bands.splice(removeBand, 1);
    }
  }

  return next;
}

export function fitRawBands(
  bands: FirstPartyEditorBand[],
  low: number,
  high: number
): FirstPartyEditorBand[] {
  if (bands.length === 0) {
    return [{ min: low, max: high, label: "Result", description: "" }];
  }
  const next = bands.map((band) => ({ ...band }));
  const numbered = next.filter((band) => Number.isFinite(band.min) && Number.isFinite(band.max));
  if (numbered.length === 0) {
    next[0].min = low;
    next[0].max = high;
    return next;
  }
  const lowest = numbered.reduce((current, band) => (band.min <= current.min ? band : current));
  const highest = numbered.reduce((current, band) => (band.max >= current.max ? band : current));
  lowest.min = low;
  highest.max = high;
  for (const band of next) {
    if (Number.isFinite(band.min) && Number.isFinite(band.max) && band.min > band.max) {
      band.max = band.min;
    }
  }
  return next;
}

function bandCoverageError(bands: OutcomeBand[], low: number, high: number) {
  const sorted = [...bands].sort((left, right) => left.min - right.min);
  if (sorted[0]?.min !== low) {
    return `The lowest designation must start at ${low}.`;
  }
  if (sorted[sorted.length - 1]?.max !== high) {
    return `The highest designation must end at ${high}.`;
  }
  for (let index = 0; index < sorted.length; index += 1) {
    const band = sorted[index];
    if (band.min > band.max) {
      return "Each designation needs a low score that is not above its high score.";
    }
    if (index > 0 && sorted[index - 1].max + 1 !== band.min) {
      return "Designation ranges must cover every score without gaps or overlap.";
    }
  }
  return null;
}

export function compileFirstPartyDraft(
  seed: FirstPartyAssessment,
  draft: FirstPartyEditorDraft,
  options: { requireComplete: boolean }
): FirstPartyEditorResult {
  const title = capped(draft.title, FIRST_PARTY_TITLE_MAX);
  const description = capped(draft.description, FIRST_PARTY_DESCRIPTION_MAX);
  const copy: FirstPartyAssessmentCopy = {
    introduction: capped(draft.copy.introduction, FIRST_PARTY_COPY_MAX),
    purpose: capped(draft.copy.purpose, FIRST_PARTY_COPY_MAX),
    goal: capped(draft.copy.goal, FIRST_PARTY_COPY_MAX),
    honestHint: capped(draft.copy.honestHint, FIRST_PARTY_HINT_MAX),
  };

  if (options.requireComplete && !title) {
    return { ok: false, error: "Add a title." };
  }
  if (draft.items.length < 1) {
    return { ok: false, error: "Add at least one question." };
  }
  if (draft.items.length > INSTRUMENT_ITEM_MAX) {
    return { ok: false, error: `Keep the instrument to ${INSTRUMENT_ITEM_MAX} questions or fewer.` };
  }
  if (draft.bands.length < 1) {
    return { ok: false, error: "Add at least one designation." };
  }
  if (draft.bands.length > FIRST_PARTY_BAND_MAX) {
    return { ok: false, error: `Keep designations to ${FIRST_PARTY_BAND_MAX} or fewer.` };
  }

  const used = new Set<string>();
  const dimension = dimensionFromSeed(seed);
  const items = draft.items.map((item, index) => {
    const prompt = capped(item.prompt, INSTRUMENT_PROMPT_MAX);
    const choices = [
      { key: "A", label: capped(item.a, INSTRUMENT_CHOICE_LABEL_MAX) },
      { key: "B", label: capped(item.b, INSTRUMENT_CHOICE_LABEL_MAX) },
      { key: "C", label: capped(item.c, INSTRUMENT_CHOICE_LABEL_MAX) },
      { key: "D", label: capped(item.d, INSTRUMENT_CHOICE_LABEL_MAX) },
    ];
    let id = item.id.trim();
    if (!ITEM_ID.test(id) || used.has(id)) {
      id = uniqueItemId(dimension.id, index, used);
    } else {
      used.add(id);
    }
    return { id, prompt, choices };
  });

  const bands: OutcomeBand[] = draft.bands.map((band) => ({
    min: band.min,
    max: band.max,
    label: capped(band.label, FIRST_PARTY_BAND_LABEL_MAX),
    description: capped(band.description, INSTRUMENT_BAND_DESCRIPTION_MAX),
  }));

  if (options.requireComplete) {
    if (!copy.introduction || !copy.purpose || !copy.goal || !copy.honestHint) {
      return { ok: false, error: "Fill in the introduction, purpose, goal, and honest hint." };
    }
    for (const [index, item] of items.entries()) {
      if (!item.prompt) {
        return { ok: false, error: `Add a prompt for question ${index + 1}.` };
      }
      if (item.choices.some((choice) => !choice.label)) {
        return { ok: false, error: `Add A, B, C, and D for question ${index + 1}.` };
      }
    }
    for (const [index, band] of bands.entries()) {
      if (!Number.isInteger(band.min) || !Number.isInteger(band.max)) {
        return { ok: false, error: `Add a score range for designation ${index + 1}.` };
      }
      if (!band.label) {
        return { ok: false, error: `Name designation ${index + 1}.` };
      }
    }
    const range = firstPartyScoreRange(items.length);
    const coverage = bandCoverageError(bands, range.min, range.max);
    if (coverage) return { ok: false, error: coverage };
  } else {
    for (const band of bands) {
      if (!Number.isInteger(band.min)) band.min = firstPartyScoreRange(items.length).min;
      if (!Number.isInteger(band.max)) band.max = firstPartyScoreRange(items.length).max;
    }
  }

  const instrument = buildChoiceSumInstrument({
    dimensionId: dimension.id,
    dimensionLabel: dimension.label,
    items,
    bands,
  });

  return {
    ok: true,
    assessment: {
      key: seed.key,
      slug: seed.slug,
      title: title || seed.title,
      description: description || seed.description,
      questionCount: instrument.items.length,
      instrument,
      copy: {
        introduction: copy.introduction || seed.copy.introduction,
        purpose: copy.purpose || seed.copy.purpose,
        goal: copy.goal || seed.copy.goal,
        honestHint: copy.honestHint || seed.copy.honestHint,
      },
    },
  };
}

export function storedInstrumentPayload(assessment: FirstPartyAssessment) {
  return {
    ...assessment.instrument,
    copy: assessment.copy,
  };
}

function asCopy(value: unknown, fallback: FirstPartyAssessmentCopy): FirstPartyAssessmentCopy {
  if (!value || typeof value !== "object") return { ...fallback };
  const row = value as Record<string, unknown>;
  return {
    introduction:
      typeof row.introduction === "string" && row.introduction.trim()
        ? capped(row.introduction, FIRST_PARTY_COPY_MAX)
        : fallback.introduction,
    purpose:
      typeof row.purpose === "string" && row.purpose.trim()
        ? capped(row.purpose, FIRST_PARTY_COPY_MAX)
        : fallback.purpose,
    goal:
      typeof row.goal === "string" && row.goal.trim()
        ? capped(row.goal, FIRST_PARTY_COPY_MAX)
        : fallback.goal,
    honestHint:
      typeof row.honestHint === "string" && row.honestHint.trim()
        ? capped(row.honestHint, FIRST_PARTY_HINT_MAX)
        : fallback.honestHint,
  };
}

export function parseStoredFirstPartyInstrument(
  value: unknown,
  seed: FirstPartyAssessment
): { instrument: AssessmentInstrument; copy: FirstPartyAssessmentCopy } | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!Array.isArray(row.items) || row.items.length < 1 || row.items.length > INSTRUMENT_ITEM_MAX) {
    return null;
  }
  const scoring = row.scoring as { outcome?: { kind?: string; bands?: unknown } } | undefined;
  if (scoring?.outcome?.kind !== "bands" || !Array.isArray(scoring.outcome.bands)) {
    return null;
  }

  const items: FirstPartyEditorItem[] = [];
  for (const entry of row.items) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== "string" || !ITEM_ID.test(item.id)) return null;
    if (typeof item.prompt !== "string" || !item.prompt.trim()) return null;
    if (!Array.isArray(item.choices)) return null;
    const labels: Record<string, string> = {};
    for (const choice of item.choices) {
      if (!choice || typeof choice !== "object") return null;
      const rowChoice = choice as Record<string, unknown>;
      if (typeof rowChoice.key !== "string" || typeof rowChoice.label !== "string") return null;
      labels[rowChoice.key] = rowChoice.label;
    }
    if (!labels.A || !labels.B || !labels.C || !labels.D) return null;
    items.push({
      id: item.id,
      prompt: item.prompt,
      a: labels.A,
      b: labels.B,
      c: labels.C,
      d: labels.D,
    });
  }

  const bands: FirstPartyEditorBand[] = [];
  for (const entry of scoring.outcome.bands) {
    if (!entry || typeof entry !== "object") return null;
    const band = entry as Record<string, unknown>;
    if (!Number.isInteger(band.min) || !Number.isInteger(band.max)) return null;
    if (typeof band.label !== "string" || !band.label.trim()) return null;
    bands.push({
      min: Number(band.min),
      max: Number(band.max),
      label: band.label,
      description: typeof band.description === "string" ? band.description : "",
    });
  }

  const compiled = compileFirstPartyDraft(
    seed,
    {
      title: seed.title,
      description: seed.description,
      copy: asCopy(row.copy, seed.copy),
      items,
      bands,
    },
    { requireComplete: true }
  );
  if (!compiled.ok) return null;
  return { instrument: compiled.assessment.instrument, copy: compiled.assessment.copy };
}

export function overlayFirstPartyAssessment(
  seed: FirstPartyAssessment,
  row: FirstPartyCatalogRow | null | undefined
): FirstPartyAssessment {
  if (!row) return seed;
  const parsed = parseStoredFirstPartyInstrument(row.instrument, seed);
  const title =
    typeof row.title === "string" && row.title.trim()
      ? capped(row.title, FIRST_PARTY_TITLE_MAX)
      : seed.title;
  const description =
    typeof row.description === "string" && row.description.trim()
      ? capped(row.description, FIRST_PARTY_DESCRIPTION_MAX)
      : seed.description;
  if (!parsed) {
    return {
      ...seed,
      title,
      description,
    };
  }
  return {
    ...seed,
    title,
    description,
    questionCount: parsed.instrument.items.length,
    instrument: parsed.instrument,
    copy: parsed.copy,
  };
}

export function firstPartyInstrumentReady(assessment: FirstPartyAssessment) {
  const draft = draftFromFirstParty(assessment);
  return compileFirstPartyDraft(assessment, draft, { requireComplete: true });
}
