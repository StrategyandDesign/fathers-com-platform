import { slugify } from "@/lib/admin/slug";
import {
  ARCHIVE_CONFIRM,
  DEVELOPMENT_NOTES_MAX,
  WORKING_TITLE_MAX,
  asDevelopmentStatus,
  type DevelopmentStatus,
  type ReadyChecklistItem,
} from "@/lib/admin/development";
export const PLATFORM_ASSESSMENT_KEY_PREFIX = "plat_";

export const PLATFORM_ASSESSMENT_SLUG_MIN = 3;
export const PLATFORM_ASSESSMENT_SLUG_MAX = 32;
export const PLATFORM_ASSESSMENT_TITLE_MAX = 120;
export const PLATFORM_ASSESSMENT_DESCRIPTION_MAX = 2000;
export const PLATFORM_ASSESSMENT_PROMPT_MAX = 1000;
export const PLATFORM_ASSESSMENT_BAND_LABEL_MAX = 80;
export const PLATFORM_ASSESSMENT_BAND_BODY_MAX = 400;
export const PLATFORM_ASSESSMENT_DOMAIN_KEY_MAX = 40;
export const PLATFORM_ASSESSMENT_MAX_DOMAINS = 16;
export const PLATFORM_ASSESSMENT_MAX_ITEMS = 128;
export const PLATFORM_ASSESSMENT_MAX_BANDS = 12;
export const PLATFORM_ASSESSMENT_WEIGHT_MIN = 0.01;
export const PLATFORM_ASSESSMENT_WEIGHT_MAX = 99.99;

export const PLATFORM_SCALE_MIN = 1;
export const PLATFORM_SCALE_MAX = 5;

export const SCORING_METHODS = ["weighted_mean"] as const;
export type ScoringMethod = (typeof SCORING_METHODS)[number];

export const RESERVED_ASSESSMENT_SLUGS = new Set([
  "keystone",
  "new",
  "platform",
  "admin",
  "p",
]);

export const DEFAULT_INTERPRETATION_BANDS: Array<{
  minScore: number;
  maxScore: number;
  label: string;
  description: string;
}> = [
  {
    minScore: 0,
    maxScore: 39,
    label: "Getting started",
    description: "This area is early. Name one small next step.",
  },
  {
    minScore: 40,
    maxScore: 69,
    label: "Growing",
    description: "There is a foundation. Keep the practice that is already working.",
  },
  {
    minScore: 70,
    maxScore: 100,
    label: "Strong",
    description: "This is a strength to use. Offer it where it helps the family.",
  },
];

export function isScoringMethod(value: unknown): value is ScoringMethod {
  return value === "weighted_mean";
}

export function isAuthoredPlatformAssessmentKey(value: string) {
  return (
    value.startsWith(PLATFORM_ASSESSMENT_KEY_PREFIX) &&
    value.length >= 8 &&
    value.length <= 64 &&
    /^plat_[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

export function isReviewableAssessmentKey(value: string) {
  return value === "keystone" || isAuthoredPlatformAssessmentKey(value);
}

export function platformAssessmentKeyFromSlug(slug: string) {
  return `${PLATFORM_ASSESSMENT_KEY_PREFIX}${slug}`;
}

export function assessmentSlugify(value: string) {
  const slug = slugify(value).slice(0, PLATFORM_ASSESSMENT_SLUG_MAX);
  if (slug.length >= PLATFORM_ASSESSMENT_SLUG_MIN && !RESERVED_ASSESSMENT_SLUGS.has(slug)) {
    return slug;
  }
  return "";
}

export function parseAssessmentSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PLATFORM_ASSESSMENT_SLUG_MAX);
  if (slug.length < PLATFORM_ASSESSMENT_SLUG_MIN) {
    return { ok: false as const, error: "Use a slug of at least 3 letters or numbers." };
  }
  if (RESERVED_ASSESSMENT_SLUGS.has(slug)) {
    return { ok: false as const, error: "That slug is reserved." };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false as const, error: "Use lowercase letters, numbers, and hyphens." };
  }
  return { ok: true as const, slug };
}

export function localizedText(
  english: string,
  hebrew: string | null | undefined,
  locale: string
) {
  if (locale === "he" && hebrew?.trim()) return hebrew.trim();
  return english;
}

export function clampWeight(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(
    PLATFORM_ASSESSMENT_WEIGHT_MAX,
    Math.max(PLATFORM_ASSESSMENT_WEIGHT_MIN, value)
  );
}

export function likertToPercent(
  raw: number,
  reverseScored: boolean,
  scaleMin = PLATFORM_SCALE_MIN,
  scaleMax = PLATFORM_SCALE_MAX
) {
  const scored = reverseScored ? scaleMax + scaleMin - raw : raw;
  const span = scaleMax - scaleMin;
  if (span <= 0) return 0;
  return ((scored - scaleMin) / span) * 100;
}

export function weightedMean(pairs: Array<{ value: number; weight: number }>) {
  let total = 0;
  let weight = 0;
  for (const pair of pairs) {
    if (!Number.isFinite(pair.value) || !Number.isFinite(pair.weight) || pair.weight <= 0) {
      continue;
    }
    total += pair.value * pair.weight;
    weight += pair.weight;
  }
  if (weight <= 0) return 0;
  return total / weight;
}

export function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

export type ScoreableItem = {
  id: string;
  weight: number;
  reverseScored: boolean;
};

export type ScoreableDomain = {
  id: string;
  key: string;
  title: string;
  weight: number;
  items: ScoreableItem[];
};

export type ScoreableBand = {
  minScore: number;
  maxScore: number;
  label: string;
  labelHe?: string | null;
  description?: string | null;
  descriptionHe?: string | null;
};

export type InstrumentScore = {
  overall: number;
  complete: boolean;
  answered: number;
  total: number;
  domains: Array<{
    id: string;
    key: string;
    title: string;
    score: number;
    answered: number;
    total: number;
    weightShare: number;
  }>;
  band: ScoreableBand | null;
};

export function pickInterpretationBand(score: number, bands: ScoreableBand[]) {
  const ordered = [...bands].sort((left, right) => left.minScore - right.minScore);
  return (
    ordered.find((band) => score >= band.minScore && score <= band.maxScore) ??
    ordered.find((band) => score >= band.minScore && score < band.maxScore + 0.05) ??
    null
  );
}

export function scoreInstrument(input: {
  domains: ScoreableDomain[];
  answers: Record<string, number>;
  bands: ScoreableBand[];
  scaleMin?: number;
  scaleMax?: number;
}): InstrumentScore {
  const scaleMin = input.scaleMin ?? PLATFORM_SCALE_MIN;
  const scaleMax = input.scaleMax ?? PLATFORM_SCALE_MAX;
  const domainResults: InstrumentScore["domains"] = [];
  const overallPairs: Array<{ value: number; weight: number }> = [];
  let answered = 0;
  let total = 0;
  const domainWeightTotal = input.domains.reduce(
    (sum, domain) => sum + (domain.weight > 0 ? domain.weight : 0),
    0
  );

  for (const domain of input.domains) {
    const itemPairs: Array<{ value: number; weight: number }> = [];
    let domainAnswered = 0;
    for (const item of domain.items) {
      total += 1;
      const raw = input.answers[item.id];
      if (!Number.isInteger(raw) || raw < scaleMin || raw > scaleMax) continue;
      domainAnswered += 1;
      answered += 1;
      itemPairs.push({
        value: likertToPercent(raw, item.reverseScored, scaleMin, scaleMax),
        weight: item.weight,
      });
    }
    const domainScore = itemPairs.length > 0 ? weightedMean(itemPairs) : 0;
    if (itemPairs.length > 0 && domain.weight > 0) {
      overallPairs.push({ value: domainScore, weight: domain.weight });
    }
    domainResults.push({
      id: domain.id,
      key: domain.key,
      title: domain.title,
      score: roundScore(domainScore),
      answered: domainAnswered,
      total: domain.items.length,
      weightShare:
        domainWeightTotal > 0 && domain.weight > 0
          ? Math.round((domain.weight / domainWeightTotal) * 1000) / 10
          : 0,
    });
  }

  const overall = roundScore(weightedMean(overallPairs));
  return {
    overall,
    complete: total > 0 && answered === total,
    answered,
    total,
    domains: domainResults,
    band: pickInterpretationBand(overall, input.bands),
  };
}

export type InstrumentDomainDraft = {
  clientId: string;
  key: string;
  title: string;
  titleHe: string;
  description: string;
  weight: number;
  items: Array<{
    clientId: string;
    prompt: string;
    promptHe: string;
    reverseScored: boolean;
    weight: number;
  }>;
};

export type InstrumentBandDraft = {
  clientId: string;
  minScore: number;
  maxScore: number;
  label: string;
  labelHe: string;
  description: string;
  descriptionHe: string;
};

export type InstrumentDraft = {
  domains: InstrumentDomainDraft[];
  bands: InstrumentBandDraft[];
};

export function emptyDomainDraft(): InstrumentDomainDraft {
  return {
    clientId: crypto.randomUUID(),
    key: "",
    title: "",
    titleHe: "",
    description: "",
    weight: 1,
    items: [emptyItemDraft()],
  };
}

export function emptyItemDraft() {
  return {
    clientId: crypto.randomUUID(),
    prompt: "",
    promptHe: "",
    reverseScored: false,
    weight: 1,
  };
}

export function emptyBandDraft(
  defaults?: Partial<InstrumentBandDraft>
): InstrumentBandDraft {
  return {
    clientId: crypto.randomUUID(),
    minScore: defaults?.minScore ?? 0,
    maxScore: defaults?.maxScore ?? 100,
    label: defaults?.label ?? "",
    labelHe: defaults?.labelHe ?? "",
    description: defaults?.description ?? "",
    descriptionHe: defaults?.descriptionHe ?? "",
  };
}

export function defaultInstrumentDraft(): InstrumentDraft {
  return {
    domains: [emptyDomainDraft()],
    bands: DEFAULT_INTERPRETATION_BANDS.map((band) =>
      emptyBandDraft({
        minScore: band.minScore,
        maxScore: band.maxScore,
        label: band.label,
        description: band.description,
      })
    ),
  };
}

function asFiniteNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function parseInstrumentDraft(raw: unknown): InstrumentDraft | string {
  if (!raw || typeof raw !== "object") return "Add at least one domain and two bands.";
  const value = raw as Record<string, unknown>;
  if (!Array.isArray(value.domains) || !Array.isArray(value.bands)) {
    return "Add at least one domain and two bands.";
  }
  if (value.domains.length === 0) return "Add at least one domain.";
  if (value.domains.length > PLATFORM_ASSESSMENT_MAX_DOMAINS) {
    return `Keep the assessment to ${PLATFORM_ASSESSMENT_MAX_DOMAINS} domains or fewer.`;
  }
  if (value.bands.length === 0) return "Add interpretation bands.";
  if (value.bands.length > PLATFORM_ASSESSMENT_MAX_BANDS) {
    return `Keep the assessment to ${PLATFORM_ASSESSMENT_MAX_BANDS} bands or fewer.`;
  }

  const domains: InstrumentDomainDraft[] = [];
  let itemCount = 0;
  const domainKeys = new Set<string>();

  for (const [index, entry] of value.domains.entries()) {
    if (!entry || typeof entry !== "object") return "Each domain needs a title and a weight.";
    const row = entry as Record<string, unknown>;
    const title = String(row.title ?? "").trim();
    const titleHe = String(row.titleHe ?? row.title_he ?? "").trim();
    const description = String(row.description ?? "").trim();
    const suggestedKey = assessmentSlugify(String(row.key ?? title));
    const key = suggestedKey || `domain-${index + 1}`;
    if (!title) return "Each domain needs a title.";
    if (title.length > PLATFORM_ASSESSMENT_TITLE_MAX) {
      return `Keep each domain title under ${PLATFORM_ASSESSMENT_TITLE_MAX} characters.`;
    }
    if (titleHe.length > PLATFORM_ASSESSMENT_TITLE_MAX) {
      return `Keep each Hebrew domain title under ${PLATFORM_ASSESSMENT_TITLE_MAX} characters.`;
    }
    if (description.length > PLATFORM_ASSESSMENT_DESCRIPTION_MAX) {
      return "Keep each domain description under 2,000 characters.";
    }
    if (domainKeys.has(key)) return "Each domain needs a different key.";
    domainKeys.add(key);
    if (!Array.isArray(row.items) || row.items.length === 0) {
      return `${title} needs at least one question.`;
    }

    const items: InstrumentDomainDraft["items"] = [];
    for (const item of row.items) {
      itemCount += 1;
      if (itemCount > PLATFORM_ASSESSMENT_MAX_ITEMS) {
        return `Keep the assessment to ${PLATFORM_ASSESSMENT_MAX_ITEMS} questions or fewer.`;
      }
      if (!item || typeof item !== "object") return "Each question needs a prompt.";
      const question = item as Record<string, unknown>;
      const prompt = String(question.prompt ?? "").trim();
      const promptHe = String(question.promptHe ?? question.prompt_he ?? "").trim();
      if (!prompt) return "Each question needs a prompt.";
      if (prompt.length > PLATFORM_ASSESSMENT_PROMPT_MAX) {
        return `Keep each question under ${PLATFORM_ASSESSMENT_PROMPT_MAX} characters.`;
      }
      if (promptHe.length > PLATFORM_ASSESSMENT_PROMPT_MAX) {
        return `Keep each Hebrew question under ${PLATFORM_ASSESSMENT_PROMPT_MAX} characters.`;
      }
      items.push({
        clientId: String(question.clientId ?? crypto.randomUUID()),
        prompt,
        promptHe,
        reverseScored: Boolean(question.reverseScored ?? question.reverse_scored),
        weight: clampWeight(asFiniteNumber(question.weight, 1)),
      });
    }

    domains.push({
      clientId: String(row.clientId ?? crypto.randomUUID()),
      key: key.slice(0, PLATFORM_ASSESSMENT_DOMAIN_KEY_MAX),
      title,
      titleHe,
      description,
      weight: clampWeight(asFiniteNumber(row.weight, 1)),
      items,
    });
  }

  const bands: InstrumentBandDraft[] = [];
  for (const entry of value.bands) {
    if (!entry || typeof entry !== "object") return "Each band needs a label and a score range.";
    const row = entry as Record<string, unknown>;
    const label = String(row.label ?? "").trim();
    const labelHe = String(row.labelHe ?? row.label_he ?? "").trim();
    const description = String(row.description ?? "").trim();
    const descriptionHe = String(row.descriptionHe ?? row.description_he ?? "").trim();
    const minScore = asFiniteNumber(row.minScore ?? row.min_score, 0);
    const maxScore = asFiniteNumber(row.maxScore ?? row.max_score, 100);
    if (!label) return "Each band needs a label.";
    if (label.length > PLATFORM_ASSESSMENT_BAND_LABEL_MAX) {
      return `Keep each band label under ${PLATFORM_ASSESSMENT_BAND_LABEL_MAX} characters.`;
    }
    if (labelHe.length > PLATFORM_ASSESSMENT_BAND_LABEL_MAX) {
      return `Keep each Hebrew band label under ${PLATFORM_ASSESSMENT_BAND_LABEL_MAX} characters.`;
    }
    if (description.length > PLATFORM_ASSESSMENT_BAND_BODY_MAX) {
      return "Keep each band description under 400 characters.";
    }
    if (descriptionHe.length > PLATFORM_ASSESSMENT_BAND_BODY_MAX) {
      return "Keep each Hebrew band description under 400 characters.";
    }
    if (minScore < 0 || maxScore > 100 || minScore > maxScore) {
      return "Each band needs a score range between 0 and 100.";
    }
    bands.push({
      clientId: String(row.clientId ?? crypto.randomUUID()),
      minScore,
      maxScore,
      label,
      labelHe,
      description,
      descriptionHe,
    });
  }

  return { domains, bands };
}

export function parseInstrumentFormValue(raw: string): InstrumentDraft | string {
  if (!raw.trim()) return "Add at least one domain and two bands.";
  try {
    return parseInstrumentDraft(JSON.parse(raw));
  } catch {
    return "The instrument could not be read. Try again.";
  }
}

export function itemCount(draft: Pick<InstrumentDraft, "domains">) {
  return draft.domains.reduce((sum, domain) => sum + domain.items.length, 0);
}

export function bandsCoverScale(bands: InstrumentBandDraft[]) {
  if (bands.length < 2) return false;
  const ordered = [...bands].sort((left, right) => left.minScore - right.minScore);
  if (ordered[0]!.minScore > 0) return false;
  if (ordered[ordered.length - 1]!.maxScore < 100) return false;
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]!;
    const current = ordered[index]!;
    if (current.minScore > previous.maxScore + 1) return false;
  }
  return true;
}

export type PlatformAssessmentChecklistInput = {
  title: string;
  slug: string;
  previewed_at?: string | null;
  instrument: InstrumentDraft;
};

export function platformAssessmentChecklist(input: PlatformAssessmentChecklistInput): {
  items: ReadyChecklistItem[];
  ready: boolean;
  firstMissing: string | null;
} {
  const questions = itemCount(input.instrument);
  const domainsReady =
    input.instrument.domains.length > 0 &&
    input.instrument.domains.every(
      (domain) => domain.title.trim() && domain.items.length > 0 && domain.weight > 0
    );
  const itemsReady =
    questions > 0 &&
    input.instrument.domains.every((domain) =>
      domain.items.every((item) => item.prompt.trim())
    );
  const bandsReady =
    input.instrument.bands.length >= 2 && bandsCoverScale(input.instrument.bands);

  const items: ReadyChecklistItem[] = [
    {
      key: "identity",
      label: "Title and slug are set",
      done: Boolean(input.title.trim() && input.slug.trim()),
    },
    {
      key: "domains",
      label: "At least one weighted domain",
      done: domainsReady,
    },
    {
      key: "items",
      label: "Every domain has weighted questions",
      done: itemsReady,
    },
    {
      key: "bands",
      label: "Interpretation bands cover 0 to 100",
      done: bandsReady,
    },
    {
      key: "previewed",
      label: "Stage preview walked end-to-end",
      done: Boolean(input.previewed_at),
    },
  ];

  let firstMissing: string | null = null;
  if (!items[0].done) firstMissing = "Add a title and slug.";
  else if (!domainsReady) firstMissing = "Add at least one domain with a weight.";
  else if (!itemsReady) firstMissing = "Add a prompt to every question.";
  else if (!bandsReady) firstMissing = "Add at least two bands that cover 0 to 100.";
  else if (!input.previewed_at) firstMissing = "Walk the Stage preview end-to-end before marking Ready.";

  return {
    items,
    ready: items.every((item) => item.done),
    firstMissing,
  };
}

export function firstAssessmentReadyBlocker(input: PlatformAssessmentChecklistInput) {
  return platformAssessmentChecklist(input).firstMissing;
}

export function assessmentReleaseState(input: {
  published?: boolean | null;
  releasedAt?: string | null;
  firstReleasedAt?: string | null;
  developmentStatus?: string | null;
}): "draft" | "ready" | "catalog" | "released" {
  if (input.releasedAt) return "released";
  if (asDevelopmentStatus(input.developmentStatus) === "ready_for_review" || input.published) {
    return "ready";
  }
  if (input.firstReleasedAt) return "ready";
  return "draft";
}

export function isArchivedAssessment(row: { development_status?: string | null }) {
  return asDevelopmentStatus(row.development_status) === "archived";
}

export function platformTakeHref(
  assessmentKey: string,
  questionNumber?: number,
  options?: { root?: string }
) {
  const root = options?.root ?? "/father";
  const base = `${root}/assessments/p/${encodeURIComponent(assessmentKey)}`;
  return questionNumber ? `${base}?q=${questionNumber}` : base;
}

export function platformResultsHref(
  assessmentKey: string,
  options?: { root?: string }
) {
  return `${options?.root ?? "/father"}/assessments/p/${encodeURIComponent(assessmentKey)}`;
}

export { ARCHIVE_CONFIRM, DEVELOPMENT_NOTES_MAX, WORKING_TITLE_MAX, asDevelopmentStatus };
export type { DevelopmentStatus };
