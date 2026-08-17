import { createClient } from "@/lib/supabase/server";

export const COMPLETION_STATUSES = ["not_started", "in_progress", "completed"] as const;

export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export type ProfileStatus = "completed" | "in_progress" | "not_started";

export type InsightFilters = {
  groupId: string | null;
  trainingId: string | null;
  status: CompletionStatus | null;
  from: string | null;
  to: string | null;
};

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

export type InsightRow = {
  participantLabel: string;
  groupLabel: string;
  profileStatus: ProfileStatus;
  completionStatus: CompletionStatus;
  trainingsCompleted: number;
  trainingsInProgress: number;
  trainingsNotStarted: number;
  sessionsCompleted: number;
  sessionsTotal: number;
  activityWeek: string | null;
};

export type InsightGroupOption = {
  id: string;
  label: string;
};

export type InsightTrainingOption = {
  id: string;
  title: string;
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
  rows: InsightRow[];
  groups: InsightGroupOption[];
  trainings: InsightTrainingOption[];
  participantCount: number;
};

export const PROFILE_STATUS_LABEL: Record<ProfileStatus, string> = {
  completed: "Completed",
  in_progress: "In progress",
  not_started: "Not started",
};

export const COMPLETION_STATUS_LABEL: Record<CompletionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PARAM =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function isCompletionStatus(value: string): value is CompletionStatus {
  return (COMPLETION_STATUSES as readonly string[]).includes(value);
}

function isProfileStatus(value: string): value is ProfileStatus {
  return value === "completed" || value === "in_progress" || value === "not_started";
}

function readDate(value: string | undefined, label: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { value: null as string | null };
  if (!DATE_PARAM.test(trimmed)) {
    return { value: null as string | null, error: `${label} must be a valid date.` };
  }
  if (Number.isNaN(Date.parse(`${trimmed}T00:00:00Z`))) {
    return { value: null as string | null, error: `${label} must be a valid date.` };
  }
  return { value: trimmed };
}

function readUuid(value: string | undefined, label: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { value: null as string | null };
  if (!UUID_PARAM.test(trimmed)) {
    return { value: null as string | null, error: `${label} is not valid.` };
  }
  return { value: trimmed };
}

export function parseInsightSearchParams(params: {
  group_id?: string;
  training_id?: string;
  status?: string;
  from?: string;
  to?: string;
  error?: string;
  notice?: string;
}) {
  const errors: string[] = [];
  const group = readUuid(params.group_id, "Group");
  const training = readUuid(params.training_id, "Training");
  const statusRaw = params.status?.trim() || "";
  let status: CompletionStatus | null = null;

  if (group.error) errors.push(group.error);
  if (training.error) errors.push(training.error);

  if (statusRaw) {
    if (isCompletionStatus(statusRaw)) {
      status = statusRaw;
    } else {
      errors.push("Completion status must be not started, in progress, or completed.");
    }
  }

  const from = readDate(params.from, "Start date");
  const to = readDate(params.to, "End date");
  if (from.error) errors.push(from.error);
  if (to.error) errors.push(to.error);
  if (from.value && to.value && from.value > to.value) {
    errors.push("The start date must be on or before the end date.");
  }

  return {
    filters: {
      groupId: group.value,
      trainingId: training.value,
      status,
      from: from.value,
      to: to.value,
    } satisfies InsightFilters,
    error: params.error || errors[0],
    notice: params.notice,
  };
}

export function insightQuery(filters: InsightFilters, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (filters.groupId) params.set("group_id", filters.groupId);
  if (filters.trainingId) params.set("training_id", filters.trainingId);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  return params.toString();
}

export function insightFilename() {
  return `fathers-com-insights-${new Date().toISOString().slice(0, 10)}.csv`;
}

export function hasInsightFilters(filters: InsightFilters) {
  return Boolean(
    filters.groupId || filters.trainingId || filters.status || filters.from || filters.to
  );
}

export function toFilterPayload(filters: InsightFilters) {
  const payload: Record<string, string> = {};
  if (filters.groupId) payload.group_id = filters.groupId;
  if (filters.trainingId) payload.training_id = filters.trainingId;
  if (filters.status) payload.status = filters.status;
  if (filters.from) payload.from = filters.from;
  if (filters.to) payload.to = filters.to;
  return payload;
}

export function progressLabel(row: InsightRow, trainingId: string | null) {
  if (trainingId) {
    return `${row.sessionsCompleted}/${row.sessionsTotal} sessions`;
  }
  return `${row.trainingsCompleted} complete · ${row.trainingsInProgress} in progress`;
}

export function formatActivityWeek(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return `Week of ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function asGroups(value: unknown): InsightGroupOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({
      id: String((row as { id?: unknown }).id ?? ""),
      label: String((row as { label?: unknown }).label ?? "Group"),
    }))
    .filter((row) => row.id);
}

function asTrainings(value: unknown): InsightTrainingOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({
      id: String((row as { id?: unknown }).id ?? ""),
      title: String((row as { title?: unknown }).title ?? "Training"),
    }))
    .filter((row) => row.id);
}

function asRows(value: unknown): InsightRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = entry as Record<string, unknown>;
    const profileRaw = String(row.profile_status ?? "");
    const completionRaw = String(row.completion_status ?? "");
    if (!isProfileStatus(profileRaw) || !isCompletionStatus(completionRaw)) {
      return [];
    }

    const activityWeek = row.activity_week;
    return [
      {
        participantLabel: String(row.participant_label ?? ""),
        groupLabel: String(row.group_label ?? "Group"),
        profileStatus: profileRaw,
        completionStatus: completionRaw,
        trainingsCompleted: asNumber(row.trainings_completed),
        trainingsInProgress: asNumber(row.trainings_in_progress),
        trainingsNotStarted: asNumber(row.trainings_not_started),
        sessionsCompleted: asNumber(row.sessions_completed),
        sessionsTotal: asNumber(row.sessions_total),
        activityWeek:
          typeof activityWeek === "string" && DATE_PARAM.test(activityWeek)
            ? activityWeek
            : null,
      },
    ];
  });
}

function parseInsightsPayload(data: unknown): Omit<
  ReviewerInsights,
  "rows" | "groups" | "trainings" | "participantCount"
> {
  if (!data || typeof data !== "object") {
    return {
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
  }

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
  };
}

export async function loadReviewerInsights(filters: InsightFilters = {
  groupId: null,
  trainingId: null,
  status: null,
  from: null,
  to: null,
}) {
  const supabase = await createClient();
  const payload = toFilterPayload(filters);

  const [insightsRes, rowsRes] = await Promise.all([
    supabase.rpc("reviewer_insights", { p_filters: payload }),
    supabase.rpc("reviewer_insight_rows", { p_filters: payload }),
  ]);

  if (insightsRes.error) throw insightsRes.error;
  if (rowsRes.error) throw rowsRes.error;

  const insights = parseInsightsPayload(insightsRes.data);
  const listing =
    rowsRes.data && typeof rowsRes.data === "object"
      ? (rowsRes.data as Record<string, unknown>)
      : {};
  const groups = asGroups(listing.groups);
  const trainings = asTrainings(listing.trainings);
  const rows = asRows(listing.rows);

  let error: string | undefined;
  if (filters.groupId && !groups.some((group) => group.id === filters.groupId)) {
    error = "That group is not in the cohort.";
  } else if (
    filters.trainingId &&
    !trainings.some((training) => training.id === filters.trainingId)
  ) {
    error = "That training is not in the catalog.";
  }

  return {
    ...insights,
    rows: error ? [] : rows,
    groups,
    trainings,
    participantCount: asNumber(listing.participant_count),
    error,
  } satisfies ReviewerInsights & { error?: string };
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: InsightRow[], trainingId: string | null) {
  const header = [
    "Participant",
    "Group",
    "Training progress",
    "Completion status",
    "Last activity week",
  ];

  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.participantLabel,
        row.groupLabel,
        progressLabel(row, trainingId),
        COMPLETION_STATUS_LABEL[row.completionStatus],
        formatActivityWeek(row.activityWeek),
      ]
        .map(csvCell)
        .join(",")
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
