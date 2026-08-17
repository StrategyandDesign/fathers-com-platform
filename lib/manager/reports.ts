import type { Training } from "@/lib/father/types";
import { loadManagerWorkspace } from "@/lib/manager/data";
import {
  formatShortDate,
  type ParticipantRow,
  type TrainingProgress,
} from "@/lib/manager/types";

export const COMPLETION_STATUSES = ["not_started", "in_progress", "completed"] as const;

export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export type ReportFilters = {
  trainingId: string | null;
  status: CompletionStatus | null;
  from: string | null;
  to: string | null;
};

export type ReportRow = {
  fatherId: string;
  name: string;
  groupName: string;
  profileStatus: ParticipantRow["profileStatus"];
  completionStatus: CompletionStatus;
  assignmentTitles: string[];
  progressDetail: string;
  certificateSerials: string;
  lastActivity: string | null;
};

export const PROFILE_STATUS_LABEL: Record<ParticipantRow["profileStatus"], string> = {
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

function isCompletionStatus(value: string): value is CompletionStatus {
  return (COMPLETION_STATUSES as readonly string[]).includes(value);
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

export function parseReportSearchParams(params: {
  training_id?: string;
  status?: string;
  from?: string;
  to?: string;
  error?: string;
  notice?: string;
}) {
  const errors: string[] = [];
  const trainingId = params.training_id?.trim() || null;
  const statusRaw = params.status?.trim() || "";
  let status: CompletionStatus | null = null;

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
      trainingId,
      status,
      from: from.value,
      to: to.value,
    } satisfies ReportFilters,
    error: params.error || errors[0],
    notice: params.notice,
  };
}

export function reportQuery(filters: ReportFilters, extra?: Record<string, string>) {
  const params = new URLSearchParams();
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

export function reportFilename(format: "csv" | "pdf") {
  return `fathers-com-report-${new Date().toISOString().slice(0, 10)}.${format}`;
}

export function filterSummary(filters: ReportFilters, trainings: Training[]) {
  const training =
    filters.trainingId == null
      ? "All trainings"
      : trainings.find((row) => row.id === filters.trainingId)?.title ?? "Unknown training";
  const status = filters.status ? COMPLETION_STATUS_LABEL[filters.status] : "All statuses";
  const range =
    filters.from || filters.to
      ? `${filters.from ?? "…"} to ${filters.to ?? "…"}`
      : "Any last-activity date";

  return { training, status, range };
}

function trainingStatus(card: TrainingProgress | undefined): CompletionStatus {
  if (!card) return "not_started";
  if (card.total > 0 && card.completed === card.total) return "completed";
  if (card.completed > 0) return "in_progress";
  return "not_started";
}

function overallStatus(cards: TrainingProgress[]): CompletionStatus {
  const assigned = cards.filter((card) => card.assigned);
  if (assigned.length === 0) return "not_started";

  const completable = assigned.filter((card) => card.total > 0);
  if (completable.length > 0 && completable.every((card) => card.completed === card.total)) {
    return "completed";
  }
  if (assigned.some((card) => card.completed > 0)) return "in_progress";
  return "not_started";
}

function isInTraining(cards: TrainingProgress[], trainingId: string) {
  const card = cards.find((row) => row.training.id === trainingId);
  return Boolean(card && (card.assigned || card.completed > 0 || card.certificate));
}

function activityDay(value: string | null) {
  return value?.slice(0, 10) ?? null;
}

function activityInRange(lastActivity: string | null, from: string | null, to: string | null) {
  if (!from && !to) return true;
  const day = activityDay(lastActivity);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function toRow(
  participant: ParticipantRow,
  cards: TrainingProgress[],
  trainingId: string | null
): ReportRow {
  const assigned = cards.filter((card) => card.assigned);
  const scoped = trainingId
    ? cards.filter((card) => card.training.id === trainingId)
    : assigned;
  const certCards = (trainingId ? scoped : cards).filter((card) => card.certificate);

  return {
    fatherId: participant.fatherId,
    name: participant.name,
    groupName: participant.groupName,
    profileStatus: participant.profileStatus,
    completionStatus: trainingId
      ? trainingStatus(cards.find((card) => card.training.id === trainingId))
      : overallStatus(cards),
    assignmentTitles: assigned.map((card) => card.training.title),
    progressDetail: trainingId
      ? scoped[0]
        ? `${scoped[0].completed}/${scoped[0].total} sessions`
        : "—"
      : assigned.length === 0
        ? "None assigned"
        : assigned
            .map((card) => `${card.training.title} ${card.completed}/${card.total}`)
            .join("; "),
    certificateSerials: certCards
      .map((card) => `${card.training.title}: ${card.certificate?.serial_number}`)
      .join("; "),
    lastActivity: participant.lastActivity,
  };
}

export async function loadManagerReport(managerId: string, filters: ReportFilters) {
  const workspace = await loadManagerWorkspace(managerId);
  const { trainings, participants, trainingProgressFor } = workspace;

  if (filters.trainingId && !trainings.some((training) => training.id === filters.trainingId)) {
    return {
      rows: [] as ReportRow[],
      trainings,
      participantCount: participants.length,
      error: "That training is not in the catalog.",
    };
  }

  const rows: ReportRow[] = [];
  for (const participant of participants) {
    const cards = trainingProgressFor(participant.fatherId);
    if (filters.trainingId && !isInTraining(cards, filters.trainingId)) continue;

    const row = toRow(participant, cards, filters.trainingId);
    if (filters.status && row.completionStatus !== filters.status) continue;
    if (!activityInRange(row.lastActivity, filters.from, filters.to)) continue;
    rows.push(row);
  }

  return {
    rows,
    trainings,
    participantCount: participants.length,
    error: undefined as string | undefined,
  };
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: ReportRow[]) {
  const header = [
    "Name",
    "Group",
    "Profile status",
    "Training assignments",
    "Completion status",
    "Session progress",
    "Certificate serials",
    "Last activity",
  ];

  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.name,
        row.groupName,
        PROFILE_STATUS_LABEL[row.profileStatus],
        row.assignmentTitles.join("; ") || "None assigned",
        COMPLETION_STATUS_LABEL[row.completionStatus],
        row.progressDetail,
        row.certificateSerials,
        formatShortDate(row.lastActivity),
      ]
        .map(csvCell)
        .join(",")
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
