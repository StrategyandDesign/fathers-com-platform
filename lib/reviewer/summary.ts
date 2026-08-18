import { dateLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveGroupsExportLocale } from "@/lib/i18n/org-locale";
import { createTranslator, type Translate } from "@/lib/i18n/translate";
import { createClient } from "@/lib/supabase/server";
import {
  COMPLETION_STATUS_LABEL,
  loadReviewerInsights,
  type InsightFilters,
  type InsightRow,
  type ReviewerInsights,
  toFilterPayload,
} from "@/lib/reviewer/insights";

export type ReviewerImpactSummary = {
  generatedAt: string;
  filterLines: string[];
  totalParticipants: number;
  startedCount: number;
  startedPct: number;
  oneSessionCount: number;
  oneSessionPct: number;
  fullyCompletedCount: number;
  fullyCompletedPct: number;
  certificatesIssued: number;
  trend: {
    leftLabel: string;
    rightLabel: string;
    left: number;
    right: number;
    unit: string;
  } | null;
  groups: Array<{
    label: string;
    enrolled: number;
    startedPct: number;
    oneSessionPct: number;
    fullyCompletedPct: number;
  }>;
};

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function started(row: InsightRow) {
  return row.completionStatus !== "not_started" || row.sessionsCompleted > 0;
}

function oneSession(row: InsightRow) {
  return row.sessionsCompleted > 0;
}

function fullyCompleted(row: InsightRow) {
  return row.completionStatus === "completed";
}

function formatDay(value: string, locale: Locale = DEFAULT_LOCALE) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale === "he" ? dateLocale(locale) : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatWeekLabel(value: string, locale: Locale = DEFAULT_LOCALE) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale === "he" ? dateLocale(locale) : "en-US", {
    month: "short",
    day: "numeric",
  });
}

function statusCopy(status: NonNullable<InsightFilters["status"]>, t: Translate) {
  if (status === "completed") return t("reviewer.completed");
  if (status === "in_progress") return t("reviewer.inProgress");
  return t("reviewer.notStarted");
}

export function filterSummaryLines(
  filters: InsightFilters,
  insights: Pick<ReviewerInsights, "groups" | "trainings">,
  locale: Locale = DEFAULT_LOCALE
) {
  if (locale !== "he") {
    const group =
      filters.groupId == null
        ? "All groups"
        : insights.groups.find((row) => row.id === filters.groupId)?.label ?? "Selected group";
    const training =
      filters.trainingId == null
        ? "All trainings"
        : insights.trainings.find((row) => row.id === filters.trainingId)?.title ??
          "Selected training";
    const status = filters.status
      ? COMPLETION_STATUS_LABEL[filters.status]
      : "All completion statuses";
    const range =
      filters.from || filters.to
        ? `${filters.from ? formatDay(filters.from) : "…"} to ${filters.to ? formatDay(filters.to) : "…"}`
        : "Any last-activity date";

    return [
      `Group: ${group}`,
      `Training: ${training}`,
      `Status: ${status}`,
      `Last activity: ${range}`,
    ];
  }

  const t = createTranslator(locale);
  const group =
    filters.groupId == null
      ? t("reviewer.allGroups")
      : insights.groups.find((row) => row.id === filters.groupId)?.label ??
        t("reviewer.summary.selectedGroup");
  const training =
    filters.trainingId == null
      ? t("reviewer.allTrainings")
      : insights.trainings.find((row) => row.id === filters.trainingId)?.title ??
        t("reviewer.summary.selectedTraining");
  const status = filters.status ? statusCopy(filters.status, t) : t("reviewer.summary.allStatuses");
  const range =
    filters.from || filters.to
      ? t("reviewer.summary.rangeTo", {
          from: filters.from ? formatDay(filters.from, locale) : "…",
          to: filters.to ? formatDay(filters.to, locale) : "…",
        })
      : t("reviewer.summary.anyDate");

  return [
    t("reviewer.summary.groupLine", { value: group }),
    t("reviewer.summary.trainingLine", { value: training }),
    t("reviewer.summary.statusLine", { value: status }),
    t("reviewer.summary.lastActivity", { range }),
  ];
}

function buildTrend(rows: InsightRow[], locale: Locale = DEFAULT_LOCALE) {
  const t = createTranslator(locale);
  const weeks = [
    ...new Set(rows.map((row) => row.activityWeek).filter((value): value is string => Boolean(value))),
  ].sort();

  if (weeks.length >= 2) {
    const mid = weeks[Math.ceil(weeks.length / 2)];
    const earlier = rows.filter((row) => row.activityWeek && row.activityWeek < mid);
    const later = rows.filter((row) => row.activityWeek && row.activityWeek >= mid);
    if (earlier.length > 0 && later.length > 0) {
      return {
        leftLabel:
          locale === "he"
            ? t("reviewer.summary.throughWeek", { date: formatWeekLabel(weeks[0], locale) })
            : `Through week of ${formatWeekLabel(weeks[0])}`,
        rightLabel:
          locale === "he"
            ? t("reviewer.summary.fromWeek", { date: formatWeekLabel(mid, locale) })
            : `From week of ${formatWeekLabel(mid)}`,
        left: percent(earlier.filter(fullyCompleted).length, earlier.length),
        right: percent(later.filter(fullyCompleted).length, later.length),
        unit: locale === "he" ? t("reviewer.summary.completionRate") : "completion rate",
      };
    }
  }

  return null;
}

export function buildReviewerImpactSummary(
  insights: ReviewerInsights,
  filters: InsightFilters,
  certificatesIssued: number,
  locale: Locale = DEFAULT_LOCALE
): ReviewerImpactSummary {
  const rows = insights.rows;
  const total = rows.length;
  const startedCount = rows.filter(started).length;
  const oneSessionCount = rows.filter(oneSession).length;
  const fullyCompletedCount = rows.filter(fullyCompleted).length;

  const byGroup = new Map<string, InsightRow[]>();
  for (const row of rows) {
    const label = row.groupLabel || "Group";
    const list = byGroup.get(label) ?? [];
    list.push(row);
    byGroup.set(label, list);
  }

  const groups = [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, members]) => ({
      label,
      enrolled: members.length,
      startedPct: percent(members.filter(started).length, members.length),
      oneSessionPct: percent(members.filter(oneSession).length, members.length),
      fullyCompletedPct: percent(members.filter(fullyCompleted).length, members.length),
    }));

  return {
    generatedAt: new Date().toISOString(),
    filterLines: filterSummaryLines(filters, insights, locale),
    totalParticipants: total,
    startedCount,
    startedPct: percent(startedCount, total),
    oneSessionCount,
    oneSessionPct: percent(oneSessionCount, total),
    fullyCompletedCount,
    fullyCompletedPct: percent(fullyCompletedCount, total),
    certificatesIssued,
    trend: buildTrend(rows, locale),
    groups,
  };
}

export async function loadCertificateCount(filters: InsightFilters) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("reviewer_insight_certificates", {
      p_filters: toFilterPayload(filters),
    });
    if (error) {
      console.error("[reviewer] certificate count failed", error.message);
      return { count: 0, error: "Certificate count is unavailable right now." };
    }
    const value = typeof data === "number" ? data : Number(data);
    if (!Number.isFinite(value)) {
      return { count: 0, error: "Certificate count is unavailable right now." };
    }
    return { count: value, error: null as string | null };
  } catch (error) {
    console.error("[reviewer] certificate count failed", error);
    return { count: 0, error: "Certificate count is unavailable right now." };
  }
}

export async function loadReviewerImpactSummary(
  filters: InsightFilters,
  locale: Locale = DEFAULT_LOCALE
) {
  const [insights, certificates] = await Promise.all([
    loadReviewerInsights(filters),
    loadCertificateCount(filters),
  ]);
  return {
    insights,
    summary: buildReviewerImpactSummary(insights, filters, certificates.count, locale),
    certificateError: certificates.error,
  };
}

export async function loadReviewerImpactSummaryExport(filters: InsightFilters) {
  const [insights, certificates] = await Promise.all([
    loadReviewerInsights(filters),
    loadCertificateCount(filters),
  ]);
  const locale = await resolveGroupsExportLocale(
    filters.groupId ? [filters.groupId] : insights.groups.map((group) => group.id)
  );
  return {
    insights,
    summary: buildReviewerImpactSummary(insights, filters, certificates.count, locale),
    certificateError: certificates.error,
    locale,
  };
}

export function summaryFilename() {
  return `fathers-com-impact-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
}
