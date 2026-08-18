import {
  PROFILE_QUESTIONS,
  PROFILE_THEMES,
  hasAllAnswers,
  type ProfileTheme,
} from "@/lib/profile/questions";
import type { AnswerMap, ProfileResult, ScoringModel } from "@/lib/profile/types";

const MODEL_ID = "interim";
const MODEL_VERSION = "1.0.0";

/**
 * Interim weighted-sum model.
 *
 * Each question maps to one or more dimension weights (today: 1.0 on its theme).
 * raw[dim] = Σ (answer × weight)
 * Display scores are min–max normalized to 0–100 using that dimension's
 * scale bounds so ProgressBar can render them directly.
 *
 * Primary edge = highest edge raw score.
 * Primary determination = highest determination raw score.
 * Ties break by dimension key (ascending) so the result is stable.
 */
function requireComplete(answers: AnswerMap) {
  if (!hasAllAnswers(answers)) {
    throw new Error("Profile scoring requires every question to be answered.");
  }
}

function accumulate(answers: AnswerMap) {
  const raw: Record<string, number> = {};
  const min: Record<string, number> = {};
  const max: Record<string, number> = {};

  for (const theme of PROFILE_THEMES) {
    raw[theme.key] = 0;
    min[theme.key] = 0;
    max[theme.key] = 0;
  }

  for (const question of PROFILE_QUESTIONS) {
    const value = answers[String(question.id)];
    for (const [key, weight] of Object.entries(question.dimensions)) {
      raw[key] = (raw[key] ?? 0) + value * weight;
      min[key] = (min[key] ?? 0) + question.scaleMin * weight;
      max[key] = (max[key] ?? 0) + question.scaleMax * weight;
    }
  }

  return { raw, min, max };
}

function toPercent(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return Math.round(((value - min) / (max - min)) * 100);
}

function pickPrimary(raw: Record<string, number>, themes: ProfileTheme[]) {
  const ranked = [...themes].sort((a, b) => {
    const delta = (raw[b.key] ?? 0) - (raw[a.key] ?? 0);
    if (delta !== 0) return delta;
    return a.key.localeCompare(b.key);
  });

  return ranked[0];
}

export function evaluateInterim(answers: AnswerMap): ProfileResult {
  requireComplete(answers);

  const { raw, min, max } = accumulate(answers);
  const scores = Object.fromEntries(
    PROFILE_THEMES.map((theme) => [
      theme.key,
      toPercent(raw[theme.key] ?? 0, min[theme.key] ?? 0, max[theme.key] ?? 0),
    ])
  );

  const edge = pickPrimary(
    raw,
    PROFILE_THEMES.filter((theme) => theme.kind === "edge")
  );
  const determination = pickPrimary(
    raw,
    PROFILE_THEMES.filter((theme) => theme.kind === "determination")
  );

  return {
    primary_edge: edge.label,
    primary_determination: determination.label,
    scores,
    model_id: MODEL_ID,
    model_version: MODEL_VERSION,
  };
}

export const interimModel: ScoringModel = {
  id: MODEL_ID,
  version: MODEL_VERSION,
  evaluate: evaluateInterim,
};
