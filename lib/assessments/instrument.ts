/**
 * Researcher instrument + scoring contract.
 *
 * Industry practice (Open Scale Definition, QTI response processing, and
 * Keystone's own interim model) is the same shape: keep items separate from
 * a declarative scoring key. Do not evaluate researcher code. Reverse-keyed
 * items stay stored as answered; the model flips them when it scores.
 */

export const INSTRUMENT_VERSION = "1.0.0";
export const INSTRUMENT_ITEM_MAX = 80;
export const INSTRUMENT_PROMPT_MAX = 400;
export const INSTRUMENT_CHOICE_LABEL_MAX = 240;
export const INSTRUMENT_BAND_DESCRIPTION_MAX = 600;

export const SCORING_METHODS = ["sum_coded", "mean_coded"] as const;
export type ScoringMethod = (typeof SCORING_METHODS)[number];
export const BAND_SCORE_MODES = ["percent", "raw"] as const;
export type BandScoreMode = (typeof BAND_SCORE_MODES)[number];

export type LikertScale = {
  min: number;
  max: number;
};

export type InstrumentChoice = {
  key: string;
  label: string;
  value: number;
};

export type InstrumentItem = {
  id: string;
  prompt: string;
  dimension: string;
  coding: 1 | -1;
  choices?: InstrumentChoice[];
};

export type InstrumentDimension = {
  id: string;
  label: string;
};

export type OutcomeBand = {
  min: number;
  max: number;
  label: string;
  description?: string;
};

export type OutcomeRule =
  | { kind: "highest_dimension"; labels: Record<string, string> }
  | { kind: "bands"; dimension: string; bands: OutcomeBand[]; score?: BandScoreMode };

export type ScoringSpec = {
  method: ScoringMethod;
  scale: LikertScale;
  dimensions: InstrumentDimension[];
  outcome: OutcomeRule;
};

export type AssessmentInstrument = {
  version: string;
  items: InstrumentItem[];
  scoring: ScoringSpec;
};

export type InstrumentResult = {
  raw: Record<string, number>;
  scores: Record<string, number>;
  total: number;
  outcomeKey: string;
  outcomeLabel: string;
  outcomeDescription: string | null;
  model_id: "declarative";
  model_version: string;
};

export type ParseIssue = { ok: false; error: string };
export type ParseOk<T> = { ok: true; value: T };

function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function dimensionIdFromLabel(label: string) {
  return slugPart(label) || "dimension";
}

export function assessmentKeyFromTitle(title: string) {
  const slug = slugPart(title).slice(0, 48);
  if (slug === "keystone") return "keystone-instrument";
  if (slug.length >= 8) return slug;
  return `${slug || "scale"}-instrument`.slice(0, 64);
}

/** Catalog slug on the Pilot sandbox table: kebab case, 3-32 chars, not keystone. */
export function assessmentSlugFromTitle(title: string) {
  let slug = slugPart(title).slice(0, 32);
  if (slug === "keystone" || slug.length < 3) {
    slug = `scale-${slug || "in"}`.replace(/-+/g, "-").replace(/-$/g, "").slice(0, 32);
  }
  if (slug === "keystone" || slug.length < 3) return "brought-in";
  return slug;
}

function isScoringMethod(value: string): value is ScoringMethod {
  return (SCORING_METHODS as readonly string[]).includes(value);
}

function isBandScoreMode(value: string): value is BandScoreMode {
  return (BAND_SCORE_MODES as readonly string[]).includes(value);
}

export function isChoiceItem(
  item: InstrumentItem
): item is InstrumentItem & { choices: InstrumentChoice[] } {
  return Array.isArray(item.choices) && item.choices.length > 0;
}

function codedValue(raw: number, coding: 1 | -1, scale: LikertScale) {
  const flipped = scale.min + scale.max - raw;
  return coding === -1 ? flipped : raw;
}

function toPercent(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return Math.round(((value - min) / (max - min)) * 100);
}

export function parseQuestionOutline(text: string): ParseOk<InstrumentItem[]> | ParseIssue {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const items: InstrumentItem[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    let dimension = "";
    let prompt = line;

    const pipe = line.indexOf("|");
    const at = line.lastIndexOf("@");
    if (pipe !== -1) {
      dimension = line.slice(0, pipe).trim();
      prompt = line.slice(pipe + 1).trim();
    } else if (at !== -1) {
      prompt = line.slice(0, at).trim();
      dimension = line.slice(at + 1).trim();
    }

    let coding: 1 | -1 = 1;
    if (prompt.startsWith("- ")) {
      coding = -1;
      prompt = prompt.slice(2).trim();
    } else if (prompt.startsWith("-")) {
      coding = -1;
      prompt = prompt.slice(1).trim();
    }

    if (!dimension || !prompt) {
      return {
        ok: false,
        error: "Each question needs a dimension and a prompt. Use Dimension | prompt.",
      };
    }
    if (prompt.length > INSTRUMENT_PROMPT_MAX) {
      return { ok: false, error: `Keep each prompt under ${INSTRUMENT_PROMPT_MAX} characters.` };
    }

    const dimensionId = dimensionIdFromLabel(dimension);
    let id = `${dimensionId}-${items.length + 1}`;
    while (seen.has(id)) id = `${id}x`;
    seen.add(id);
    items.push({ id, prompt, dimension: dimensionId, coding });
  }

  if (items.length === 0) {
    return { ok: false, error: "Add at least one question." };
  }
  if (items.length > INSTRUMENT_ITEM_MAX) {
    return { ok: false, error: `Keep the instrument to ${INSTRUMENT_ITEM_MAX} questions or fewer.` };
  }

  return { ok: true, value: items };
}

function parseScale(value: string): LikertScale | null {
  const match = value.match(/^(\d+)\s*[-to]+\s*(\d+)$/i);
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;
  return { min, max };
}

function parseBandLine(line: string): OutcomeBand | null {
  const match = line.match(/^(\d+)\s*[-to]+\s*(\d+)\s+(.+)$/i);
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2]);
  const label = match[3].trim();
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max || !label) return null;
  return { min, max, label: label.slice(0, 80) };
}

export function parseScoringSpec(
  text: string,
  items: InstrumentItem[]
): ParseOk<ScoringSpec> | ParseIssue {
  const dimensionIds = [...new Set(items.map((item) => item.dimension))];
  const labels = new Map<string, string>();
  for (const item of items) {
    if (!labels.has(item.dimension)) {
      labels.set(item.dimension, item.dimension.replace(/-/g, " "));
    }
  }

  let method: ScoringMethod = "sum_coded";
  let scale: LikertScale = { min: 1, max: 5 };
  let outcomeKind: "highest_dimension" | "bands" = "highest_dimension";
  let bandDimension = dimensionIds[0] ?? "";
  let bandScore: BandScoreMode = "percent";
  const outcomeLabels: Record<string, string> = {};
  const bands: OutcomeBand[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  for (const line of lines) {
    const keyed = line.match(/^([a-z][a-z0-9_-]*)\s*:\s*(.+)$/i);
    if (keyed) {
      const key = keyed[1].toLowerCase();
      const value = keyed[2].trim();
      if (key === "method") {
        const normalized = value === "sum" ? "sum_coded" : value === "mean" ? "mean_coded" : value;
        if (!isScoringMethod(normalized)) {
          return { ok: false, error: "Scoring method must be sum or mean." };
        }
        method = normalized;
        continue;
      }
      if (key === "scale") {
        const parsed = parseScale(value);
        if (!parsed) return { ok: false, error: "Scale must look like 1-5." };
        scale = parsed;
        continue;
      }
      if (key === "score" || key === "scoremode") {
        const normalized = value.toLowerCase();
        if (!isBandScoreMode(normalized)) {
          return { ok: false, error: "Score must be percent or raw." };
        }
        bandScore = normalized;
        continue;
      }
      if (key === "outcome") {
        if (value.toLowerCase() === "highest") {
          outcomeKind = "highest_dimension";
          continue;
        }
        const bandsMatch = value.match(/^bands\s+(.+)$/i);
        if (bandsMatch) {
          outcomeKind = "bands";
          bandDimension = dimensionIdFromLabel(bandsMatch[1]);
          continue;
        }
        return { ok: false, error: "Outcome must be highest, or bands plus a dimension." };
      }
      const dimensionId = dimensionIdFromLabel(key);
      labels.set(dimensionId, key);
      outcomeLabels[dimensionId] = value.slice(0, 120);
      continue;
    }

    const band = parseBandLine(line);
    if (band) {
      outcomeKind = "bands";
      bands.push(band);
      continue;
    }

    return { ok: false, error: `Could not read this scoring line: ${line}` };
  }

  const dimensions = dimensionIds.map((id) => ({
    id,
    label: titleCase(labels.get(id) ?? id),
  }));

  if (dimensions.length === 0) {
    return { ok: false, error: "The questions need at least one dimension." };
  }

  const outcome: OutcomeRule =
    outcomeKind === "bands"
      ? { kind: "bands", dimension: bandDimension, bands, score: bandScore }
      : {
          kind: "highest_dimension",
          labels: Object.fromEntries(
            dimensions.map((dimension) => [
              dimension.id,
              outcomeLabels[dimension.id] ?? dimension.label,
            ])
          ),
        };

  if (outcome.kind === "bands") {
    if (!dimensionIds.includes(outcome.dimension)) {
      return { ok: false, error: "Band outcomes must name a dimension used in the questions." };
    }
    if (outcome.bands.length === 0) {
      return { ok: false, error: "Add at least one score band, such as 0-39 Distant." };
    }
  }

  return { ok: true, value: { method, scale, dimensions, outcome } };
}

function titleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function compileInstrument(
  questionsText: string,
  scoringText: string
): ParseOk<AssessmentInstrument> | ParseIssue {
  const items = parseQuestionOutline(questionsText);
  if (!items.ok) return items;
  const scoring = parseScoringSpec(scoringText, items.value);
  if (!scoring.ok) return scoring;
  const instrument: AssessmentInstrument = {
    version: INSTRUMENT_VERSION,
    items: items.value,
    scoring: scoring.value,
  };
  const valid = validateInstrument(instrument);
  if (!valid.ok) return valid;
  return { ok: true, value: instrument };
}

export function validateInstrument(
  instrument: AssessmentInstrument
): ParseOk<AssessmentInstrument> | ParseIssue {
  const { items, scoring } = instrument;
  if (items.length === 0) return { ok: false, error: "Add at least one question." };
  const dimensionIds = new Set(scoring.dimensions.map((dimension) => dimension.id));
  for (const item of items) {
    if (!dimensionIds.has(item.dimension)) {
      return { ok: false, error: `Question "${item.prompt}" names an unknown dimension.` };
    }
  }
  if (scoring.scale.min >= scoring.scale.max) {
    return { ok: false, error: "The Likert scale needs a low and a high that differ." };
  }
  if (scoring.outcome.kind === "bands" && scoring.outcome.bands.length === 0) {
    return { ok: false, error: "Band outcomes need at least one range." };
  }
  try {
    evaluateInstrument(instrument, sampleAnswers(instrument, scoring.scale.max));
  } catch {
    return { ok: false, error: "This scoring model could not evaluate a complete answer set." };
  }
  return { ok: true, value: instrument };
}

export function sampleAnswers(instrument: AssessmentInstrument, value: number) {
  const answers: Record<string, number> = {};
  for (const item of instrument.items) {
    if (isChoiceItem(item)) {
      const match =
        item.choices.find((choice) => choice.value === value) ??
        (value >= instrument.scoring.scale.max
          ? item.choices.reduce((best, choice) =>
              choice.value > best.value ? choice : best
            )
          : item.choices.reduce((best, choice) =>
              choice.value < best.value ? choice : best
            ));
      answers[item.id] = match.value;
      continue;
    }
    answers[item.id] = value;
  }
  return answers;
}

const DEFAULT_LETTER_VALUES: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };

export function buildChoiceSumInstrument(input: {
  dimensionId: string;
  dimensionLabel: string;
  items: Array<{
    id: string;
    prompt: string;
    choices: Array<{ key: string; label: string; value?: number }>;
  }>;
  choiceValues?: Record<string, number>;
  bands: OutcomeBand[];
}): AssessmentInstrument {
  const values = input.choiceValues ?? DEFAULT_LETTER_VALUES;
  const items: InstrumentItem[] = input.items.map((item) => ({
    id: item.id,
    prompt: item.prompt,
    dimension: input.dimensionId,
    coding: 1,
    choices: item.choices.map((choice) => ({
      key: choice.key,
      label: choice.label,
      value: choice.value ?? values[choice.key] ?? 0,
    })),
  }));
  const choiceValues = items.flatMap((item) => item.choices ?? []).map((choice) => choice.value);
  const scale = {
    min: Math.min(...choiceValues),
    max: Math.max(...choiceValues),
  };
  return {
    version: INSTRUMENT_VERSION,
    items,
    scoring: {
      method: "sum_coded",
      scale,
      dimensions: [{ id: input.dimensionId, label: input.dimensionLabel }],
      outcome: {
        kind: "bands",
        dimension: input.dimensionId,
        score: "raw",
        bands: input.bands,
      },
    },
  };
}

export function evaluateInstrument(
  instrument: AssessmentInstrument,
  answers: Record<string, number>
): InstrumentResult {
  const { scoring } = instrument;
  const raw: Record<string, number> = {};
  const counts: Record<string, number> = {};
  const min: Record<string, number> = {};
  const max: Record<string, number> = {};

  for (const dimension of scoring.dimensions) {
    raw[dimension.id] = 0;
    counts[dimension.id] = 0;
    min[dimension.id] = 0;
    max[dimension.id] = 0;
  }

  for (const item of instrument.items) {
    const answer = answers[item.id];
    if (typeof answer !== "number" || !Number.isFinite(answer)) {
      throw new Error("This instrument needs an answer for every question.");
    }
    if (isChoiceItem(item)) {
      const choice = item.choices.find((entry) => entry.value === answer);
      if (!choice) {
        throw new Error("An answer does not match a listed choice.");
      }
    } else if (answer < scoring.scale.min || answer > scoring.scale.max) {
      throw new Error("An answer sits outside the Likert scale.");
    }
    const coded = codedValue(answer, item.coding, scoring.scale);
    raw[item.dimension] = (raw[item.dimension] ?? 0) + coded;
    counts[item.dimension] = (counts[item.dimension] ?? 0) + 1;
    min[item.dimension] = (min[item.dimension] ?? 0) + scoring.scale.min;
    max[item.dimension] = (max[item.dimension] ?? 0) + scoring.scale.max;
  }

  if (scoring.method === "mean_coded") {
    for (const dimension of scoring.dimensions) {
      const count = counts[dimension.id] || 1;
      raw[dimension.id] = raw[dimension.id] / count;
      min[dimension.id] = scoring.scale.min;
      max[dimension.id] = scoring.scale.max;
    }
  }

  const scores = Object.fromEntries(
    scoring.dimensions.map((dimension) => [
      dimension.id,
      toPercent(raw[dimension.id] ?? 0, min[dimension.id] ?? 0, max[dimension.id] ?? 0),
    ])
  );

  const total = scoring.dimensions.reduce((sum, dimension) => sum + (raw[dimension.id] ?? 0), 0);

  if (scoring.outcome.kind === "bands") {
    const value =
      scoring.outcome.score === "raw"
        ? (raw[scoring.outcome.dimension] ?? 0)
        : (scores[scoring.outcome.dimension] ?? 0);
    const band =
      scoring.outcome.bands.find((entry) => value >= entry.min && value <= entry.max) ??
      scoring.outcome.bands[scoring.outcome.bands.length - 1];
    return {
      raw,
      scores,
      total,
      outcomeKey: scoring.outcome.dimension,
      outcomeLabel: band.label,
      outcomeDescription: band.description ?? null,
      model_id: "declarative",
      model_version: instrument.version,
    };
  }

  const ranked = [...scoring.dimensions].sort((a, b) => {
    const delta = (raw[b.id] ?? 0) - (raw[a.id] ?? 0);
    if (delta !== 0) return delta;
    return a.id.localeCompare(b.id);
  });
  const winner = ranked[0];
  return {
    raw,
    scores,
    total,
    outcomeKey: winner.id,
    outcomeLabel: scoring.outcome.labels[winner.id] ?? winner.label,
    outcomeDescription: null,
    model_id: "declarative",
    model_version: instrument.version,
  };
}
