import { activeModel } from "@/lib/profile/models";
import { PROFILE_THEMES, hasAllAnswers } from "@/lib/profile/questions";
import type { AnswerMap, ProfileResult } from "@/lib/profile/types";

export function evaluateProfile(answers: AnswerMap): ProfileResult {
  if (!hasAllAnswers(answers)) {
    throw new Error("Profile scoring requires every question to be answered.");
  }

  return activeModel.evaluate(answers);
}

export function profilePersistFields(result: ProfileResult) {
  return {
    primary_edge: result.primary_edge,
    primary_determination: result.primary_determination,
    raw_scores: result.scores ?? {},
    full_results: result,
  };
}

function asScoreMap(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const scores: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      scores[key] = raw;
    }
  }

  return Object.keys(scores).length > 0 ? scores : null;
}

function looksLikeDimensionScores(scores: Record<string, number>) {
  const keys = new Set(PROFILE_THEMES.map((theme) => theme.key));
  return Object.keys(scores).some((key) => keys.has(key));
}

function toDisplayPercents(scores: Record<string, number>) {
  const values = Object.values(scores);
  const peak = Math.max(...values);
  if (peak <= 5) {
    return Object.fromEntries(
      Object.entries(scores).map(([key, value]) => [key, Math.round((value / 5) * 100)])
    );
  }
  return scores;
}

/** Read 0–100 dimension scores from stored jsonb, including the prior placeholder shape. */
export function readStoredDimensionScores(
  rawScores: unknown,
  fullResults?: unknown
): Record<string, number> | null {
  const fromFull =
    fullResults && typeof fullResults === "object" && fullResults !== null
      ? asScoreMap((fullResults as { scores?: unknown }).scores)
      : null;
  const fromByTheme =
    rawScores && typeof rawScores === "object" && rawScores !== null
      ? asScoreMap((rawScores as { byTheme?: unknown }).byTheme)
      : null;
  const fromRaw = asScoreMap(rawScores);

  for (const candidate of [fromFull, fromByTheme, fromRaw]) {
    if (!candidate || !looksLikeDimensionScores(candidate)) continue;
    return toDisplayPercents(candidate);
  }

  return null;
}
