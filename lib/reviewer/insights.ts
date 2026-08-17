import { createClient } from "@/lib/supabase/server";

export type TrainingDistribution = {
  title: string;
  not_started: number;
  in_progress: number;
  completed: number;
};

export type EdgeCount = {
  label: string;
  count: number;
};

export type TrendPoint = {
  week: string;
  count: number;
};

export type ReviewerInsights = {
  total_participants: number;
  profiles_completed: number;
  profiles_completed_pct: number;
  average_sessions_completed: number;
  trainings_completed: number;
  active_groups: number;
  training_distribution: TrainingDistribution[];
  primary_edges: EdgeCount[];
  completion_trend: TrendPoint[];
};

const EMPTY_INSIGHTS: ReviewerInsights = {
  total_participants: 0,
  profiles_completed: 0,
  profiles_completed_pct: 0,
  average_sessions_completed: 0,
  trainings_completed: 0,
  active_groups: 0,
  training_distribution: [],
  primary_edges: [],
  completion_trend: [],
};

function asNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asDistribution(value: unknown): TrainingDistribution[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => ({
    title: String((row as { title?: unknown }).title ?? "Training"),
    not_started: asNumber((row as { not_started?: unknown }).not_started),
    in_progress: asNumber((row as { in_progress?: unknown }).in_progress),
    completed: asNumber((row as { completed?: unknown }).completed),
  }));
}

function asEdges(value: unknown): EdgeCount[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => ({
    label: String((row as { label?: unknown }).label ?? "Unknown"),
    count: asNumber((row as { count?: unknown }).count),
  }));
}

function asTrend(value: unknown): TrendPoint[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => ({
    week: String((row as { week?: unknown }).week ?? ""),
    count: asNumber((row as { count?: unknown }).count),
  }));
}

export async function loadReviewerInsights() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reviewer_insights");

  if (error) throw error;
  if (!data || typeof data !== "object") return EMPTY_INSIGHTS;

  const row = data as Record<string, unknown>;
  return {
    total_participants: asNumber(row.total_participants),
    profiles_completed: asNumber(row.profiles_completed),
    profiles_completed_pct: asNumber(row.profiles_completed_pct),
    average_sessions_completed: asNumber(row.average_sessions_completed),
    trainings_completed: asNumber(row.trainings_completed),
    active_groups: asNumber(row.active_groups),
    training_distribution: asDistribution(row.training_distribution),
    primary_edges: asEdges(row.primary_edges),
    completion_trend: asTrend(row.completion_trend),
  } satisfies ReviewerInsights;
}
