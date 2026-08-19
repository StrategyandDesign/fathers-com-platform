import { countSkillsUsed } from "@/lib/father/skill-use";
import { isSessionComplete, type SessionProgress, type Training } from "@/lib/father/types";
import { dateLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Translate } from "@/lib/i18n/translate";
import {
  formatShortDate,
  latestTimestamp,
  type Group,
  type ParticipantRow,
  type TrainingAssignment,
  type TrainingProgress,
} from "@/lib/manager/types";

export const COMPLETION_STATUSES = ["not_started", "in_progress", "completed"] as const;

export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export type ReportFilters = {
  groupId: string | null;
  trainingId: string | null;
  status: CompletionStatus | null;
  from: string | null;
  to: string | null;
};

export type ReportRow = {
  fatherId: string;
  name: string;
  groupId: string;
  groupName: string;
  trainingId: string | null;
  trainingTitle: string;
  completionStatus: CompletionStatus;
  sessionsCompleted: number;
  sessionsTotal: number;
  skillsUsed: number;
  assignedAt: string | null;
  completedAt: string | null;
  certificateSerial: string;
  certificateIssuedAt: string | null;
  lastProgramActivity: string | null;
};

export type ReportSummary = {
  men: number;
  rows: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  assigned: number;
};

export type ReportBuildInput = {
  participants: ParticipantRow[];
  groups: Pick<Group, "id" | "name">[];
  assignments: TrainingAssignment[];
  progress: SessionProgress[];
  trainings: Training[];
  trainingProgressFor: (fatherId: string) => TrainingProgress[];
};

export const COMPLETION_STATUS_LABEL: Record<CompletionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY_FILTERS: ReportFilters = {
  groupId: null,
  trainingId: null,
  status: null,
  from: null,
  to: null,
};

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
  group_id?: string;
  training_id?: string;
  status?: string;
  from?: string;
  to?: string;
  error?: string;
  notice?: string;
}) {
  const errors: string[] = [];
  const groupId = params.group_id?.trim() || null;
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
      groupId,
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

export function reportFilename(format: "csv" | "pdf") {
  return `fathers-com-report-${new Date().toISOString().slice(0, 10)}.${format}`;
}

export function organizationName(groups: Array<{ name?: string | null }>) {
  const names = groups.map((group) => group.name?.trim()).filter(Boolean) as string[];
  return names.join(", ") || "Your organization";
}

export function filterSummary(
  filters: ReportFilters,
  trainings: Training[],
  groups: Array<{ id: string; name: string }> = [],
  locale: Locale = DEFAULT_LOCALE
) {
  const t = createTranslator(locale);
  const group =
    filters.groupId == null
      ? locale === "he"
        ? t("manager.reports.allGroups")
        : "All groups"
      : groups.find((row) => row.id === filters.groupId)?.name ??
        (locale === "he" ? t("manager.reports.unknownGroup") : "Unknown group");
  const training =
    filters.trainingId == null
      ? locale === "he"
        ? t("manager.reports.allTrainings")
        : "All trainings"
      : trainings.find((row) => row.id === filters.trainingId)?.title ??
        (locale === "he" ? t("manager.reports.unknownTraining") : "Unknown training");
  const status = filters.status
    ? locale === "he"
      ? statusLabel(filters.status, t)
      : COMPLETION_STATUS_LABEL[filters.status]
    : locale === "he"
      ? t("manager.reports.allStatuses")
      : "All statuses";
  const range =
    filters.from || filters.to
      ? locale === "he"
        ? t("manager.reports.rangeTo", { from: filters.from ?? "…", to: filters.to ?? "…" })
        : `${filters.from ?? "…"} to ${filters.to ?? "…"}`
      : locale === "he"
        ? t("manager.reports.anyActivity")
        : "Any program activity";

  return { group, training, status, range };
}

function statusLabel(status: CompletionStatus, t: Translate) {
  if (status === "completed") return t("manager.reports.completed");
  if (status === "in_progress") return t("manager.reports.inProgress");
  return t("manager.reports.notStarted");
}

export function summarizeReport(rows: ReportRow[]): ReportSummary {
  return {
    men: new Set(rows.map((row) => row.fatherId)).size,
    rows: rows.length,
    completed: rows.filter((row) => row.completionStatus === "completed").length,
    inProgress: rows.filter((row) => row.completionStatus === "in_progress").length,
    notStarted: rows.filter((row) => row.completionStatus === "not_started").length,
    assigned: rows.filter((row) => row.trainingId).length,
  };
}

export function trainingStatus(card: TrainingProgress | undefined): CompletionStatus {
  if (!card) return "not_started";
  if (card.total > 0 && card.completed === card.total) return "completed";
  if (card.completed > 0) return "in_progress";
  return "not_started";
}

export function isInTraining(cards: TrainingProgress[], trainingId: string) {
  const card = cards.find((row) => row.training.id === trainingId);
  return Boolean(card && (card.assigned || card.completed > 0 || card.certificate));
}

function activityDay(value: string | null) {
  return value?.slice(0, 10) ?? null;
}

export function activityInRange(
  lastActivity: string | null,
  from: string | null,
  to: string | null
) {
  if (!from && !to) return true;
  const day = activityDay(lastActivity);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function sessionDates(card: TrainingProgress, progress: SessionProgress[]) {
  const sessionIds = new Set(card.sessions.map((session) => session.id));
  return progress
    .filter((row) => sessionIds.has(row.session_id) && isSessionComplete(row))
    .map((row) => row.completed_at);
}

function toAssignmentRow(
  participant: ParticipantRow,
  card: TrainingProgress | undefined,
  assignment: TrainingAssignment | undefined,
  progress: SessionProgress[]
): ReportRow {
  const status = trainingStatus(card);
  const completedDates = card ? sessionDates(card, progress) : [];
  const lastProgramActivity = latestTimestamp([
    assignment?.assigned_at,
    ...completedDates,
    card?.certificate?.issued_at,
  ]);

  return {
    fatherId: participant.fatherId,
    name: participant.name,
    groupId: participant.groupId,
    groupName: participant.groupName,
    trainingId: card?.training.id ?? null,
    trainingTitle: card?.training.title ?? "None assigned",
    completionStatus: status,
    sessionsCompleted: card?.completed ?? 0,
    sessionsTotal: card?.total ?? 0,
    skillsUsed: card
      ? countSkillsUsed(progress.filter((row) => card.sessions.some((session) => session.id === row.session_id)))
      : 0,
    assignedAt: assignment?.assigned_at ?? null,
    completedAt: status === "completed" ? latestTimestamp(completedDates) : null,
    certificateSerial: card?.certificate?.serial_number ?? "",
    certificateIssuedAt: card?.certificate?.issued_at ?? null,
    lastProgramActivity,
  };
}

export function buildManagerReport(input: ReportBuildInput, filters: ReportFilters = EMPTY_FILTERS) {
  const groupIds = new Set(input.groups.map((group) => group.id));
  if (filters.groupId && !groupIds.has(filters.groupId)) {
    return {
      rows: [] as ReportRow[],
      trainings: input.trainings,
      groups: input.groups,
      participantCount: input.participants.length,
      organization: organizationName(input.groups),
      summary: summarizeReport([]),
      error: "That group is not yours.",
    };
  }

  if (filters.trainingId && !input.trainings.some((training) => training.id === filters.trainingId)) {
    return {
      rows: [] as ReportRow[],
      trainings: input.trainings,
      groups: input.groups,
      participantCount: input.participants.length,
      organization: organizationName(input.groups),
      summary: summarizeReport([]),
      error: "That training is not available.",
    };
  }

  const scopedParticipants = filters.groupId
    ? input.participants.filter((row) => row.groupId === filters.groupId)
    : input.participants;

  const rows: ReportRow[] = [];
  for (const participant of scopedParticipants) {
    const cards = input.trainingProgressFor(participant.fatherId);
    const fatherProgress = input.progress.filter((row) => row.father_id === participant.fatherId);
    const fatherAssignments = input.assignments.filter((row) => row.father_id === participant.fatherId);

    const emit = (card: TrainingProgress | undefined) => {
      const assignment = card
        ? fatherAssignments.find((row) => row.training_id === card.training.id)
        : undefined;
      const row = toAssignmentRow(participant, card, assignment, fatherProgress);
      if (filters.status && row.completionStatus !== filters.status) return;
      if (!activityInRange(row.lastProgramActivity, filters.from, filters.to)) return;
      rows.push(row);
    };

    if (filters.trainingId) {
      if (!isInTraining(cards, filters.trainingId)) continue;
      emit(cards.find((card) => card.training.id === filters.trainingId));
      continue;
    }

    const assigned = cards.filter((card) => card.assigned);
    if (assigned.length === 0) {
      emit(undefined);
      continue;
    }
    for (const card of assigned) emit(card);
  }

  return {
    rows,
    trainings: input.trainings,
    groups: input.groups,
    participantCount: scopedParticipants.length,
    organization: organizationName(
      filters.groupId ? input.groups.filter((group) => group.id === filters.groupId) : input.groups
    ),
    summary: summarizeReport(rows),
    error: undefined as string | undefined,
  };
}

export async function loadManagerReport(managerId: string, filters: ReportFilters = EMPTY_FILTERS) {
  const { loadManagerWorkspace } = await import("@/lib/manager/data");
  const workspace = await loadManagerWorkspace(managerId);
  return buildManagerReport(
    {
      participants: workspace.participants,
      groups: workspace.groups,
      assignments: workspace.assignments,
      progress: workspace.progress,
      trainings: workspace.trainings,
      trainingProgressFor: workspace.trainingProgressFor,
    },
    filters
  );
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatReportDate(value: string | null, locale: Locale) {
  if (locale !== "he") return formatShortDate(value);
  if (!value) return "—";
  return new Date(value).toLocaleDateString(dateLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function rowsToCsv(
  rows: ReportRow[],
  locale: Locale = DEFAULT_LOCALE,
  meta?: {
    generatedAt?: string;
    organization?: string;
    filters?: ReportFilters;
    trainings?: Training[];
    groups?: Array<{ id: string; name: string }>;
  }
) {
  const generatedAt = meta?.generatedAt ?? new Date().toISOString();
  const organization = meta?.organization ?? "";
  const summary = summarizeReport(rows);
  const filters = meta?.filters ?? EMPTY_FILTERS;
  const labels = filterSummary(filters, meta?.trainings ?? [], meta?.groups ?? [], locale);
  const t = createTranslator(locale);

  const notes =
    locale === "he"
      ? [
          `# ${t("manager.reports.pdfTitle")}`,
          `# ${t("manager.reports.csvGenerated")}: ${generatedAt}`,
          `# ${t("manager.reports.csvOrganization")}: ${organization}`,
          `# ${t("manager.reports.csvFilters")}: ${labels.group} · ${labels.training} · ${labels.status} · ${labels.range}`,
          `# ${t("manager.reports.csvRowCount", { rows: summary.rows, men: summary.men })}`,
          `# ${t("manager.reports.definitionCompleted")}`,
          `# ${t("manager.reports.definitionInProgress")}`,
          `# ${t("manager.reports.definitionNotStarted")}`,
          `# ${t("manager.reports.definitionDates")}`,
        ]
      : [
          "# Fathers.com participation report",
          `# Generated: ${generatedAt}`,
          `# Organization: ${organization}`,
          `# Filters: ${labels.group} · ${labels.training} · ${labels.status} · ${labels.range}`,
          `# Rows: ${summary.rows} assignment rows · ${summary.men} men`,
          "# Completed: every session in that training is finished.",
          "# In progress: at least one session finished, not all.",
          "# Not started: assigned with zero sessions finished, or none assigned.",
          "# Date range: last program activity (assignment, session, or certificate). Join date is not counted.",
          "# Email is omitted. Leaders cannot read login emails.",
        ];

  const header =
    locale === "he"
      ? [
          t("manager.reports.name"),
          t("manager.reports.csvParticipantId"),
          t("manager.reports.csvGroup"),
          t("manager.reports.trainingCol"),
          t("manager.reports.csvCompletion"),
          t("manager.reports.csvSessionsCompleted"),
          t("manager.reports.csvSessionsTotal"),
          t("manager.reports.csvSkillsUsed"),
          t("manager.reports.csvAssignedOn"),
          t("manager.reports.csvCompletedOn"),
          t("manager.reports.csvSerials"),
          t("manager.reports.csvIssuedOn"),
          t("manager.reports.lastProgramActivity"),
          t("manager.reports.csvGeneratedAt"),
          t("manager.reports.csvOrganization"),
        ]
      : [
          "Name",
          "Participant ID",
          "Group",
          "Training",
          "Status",
          "Sessions completed",
          "Sessions total",
          "Skills used",
          "Assigned on",
          "Completed on",
          "Certificate serial",
          "Certificate issued",
          "Last program activity",
          "Generated at UTC",
          "Organization",
        ];

  const lines = [
    ...notes,
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.name,
        row.fatherId,
        row.groupName,
        locale === "he" && row.trainingTitle === "None assigned"
          ? t("manager.reports.noneAssigned")
          : row.trainingTitle,
        locale === "he" ? statusLabel(row.completionStatus, t) : COMPLETION_STATUS_LABEL[row.completionStatus],
        String(row.sessionsCompleted),
        String(row.sessionsTotal),
        String(row.skillsUsed),
        formatReportDate(row.assignedAt, locale),
        formatReportDate(row.completedAt, locale),
        row.certificateSerial,
        formatReportDate(row.certificateIssuedAt, locale),
        formatReportDate(row.lastProgramActivity, locale),
        generatedAt,
        organization,
      ]
        .map(csvCell)
        .join(",")
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
