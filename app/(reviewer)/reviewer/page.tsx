import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { resolveUserLocale } from "@/lib/i18n/resolve";
import { formatShortDate } from "@/lib/i18n/server";
import {
  COMPLETION_STATUSES,
  hasInsightFilters,
  insightQuery,
  loadReviewerInsights,
  parseInsightSearchParams,
  type InsightRow,
  type CompletionStatus,
} from "@/lib/reviewer/insights";
import { fieldClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function statusLabel(
  status: CompletionStatus,
  t: (key: string) => string
) {
  if (status === "completed") return t("reviewer.completed");
  if (status === "in_progress") return t("reviewer.inProgress");
  return t("reviewer.notStarted");
}

function groupLabel(label: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const match = /^Group (.+)$/.exec(label);
  return match ? t("reviewer.groupLabel", { n: match[1] }) : label;
}

function rowProgress(
  row: InsightRow,
  trainingId: string | null,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  if (trainingId) {
    return t("reviewer.sessionsProgress", {
      completed: row.sessionsCompleted,
      total: row.sessionsTotal,
    });
  }
  return t("reviewer.trainingsProgress", {
    completed: row.trainingsCompleted,
    inProgress: row.trainingsInProgress,
  });
}

function StackedBar({
  notStarted,
  inProgress,
  completed,
}: {
  notStarted: number;
  inProgress: number;
  completed: number;
}) {
  const total = notStarted + inProgress + completed;
  if (total === 0) {
    return <div className="h-1.5 rounded-full bg-foreground/10" />;
  }

  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-foreground/10">
      <div
        className="h-full bg-primary"
        style={{ width: `${(completed / total) * 100}%` }}
      />
      <div
        className="h-full bg-primary/50"
        style={{ width: `${(inProgress / total) * 100}%` }}
      />
      <div
        className="h-full bg-foreground/15"
        style={{ width: `${(notStarted / total) * 100}%` }}
      />
    </div>
  );
}

export default async function ReviewerInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{
    group_id?: string;
    training_id?: string;
    status?: string;
    from?: string;
    to?: string;
    error?: string;
    notice?: string;
  }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("reviewer");
  const { t, locale } = await getI18n();
  const parsed = parseInsightSearchParams(params);
  const resolved = await resolveUserLocale(user.id);
  const scopedGroupId = resolved.homeGroupId;
  const filters = {
    ...parsed.filters,
    groupId: scopedGroupId ?? parsed.filters.groupId,
  };
  const insights = await loadReviewerInsights(filters);
  if (scopedGroupId) {
    insights.groups = insights.groups.filter((group) => group.id === scopedGroupId);
  }
  const query = insightQuery(filters);
  const exportQuery = query ? `${query}&` : "";
  const filtered = hasInsightFilters(filters);

  const stats = [
    { label: t("reviewer.total"), value: String(insights.total_participants) },
    {
      label: t("reviewer.avgSessions"),
      value: insights.average_sessions_completed.toFixed(1),
    },
    { label: t("reviewer.trainings"), value: String(insights.trainings_completed) },
    { label: t("reviewer.activeGroups"), value: String(insights.active_groups) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("reviewer.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("reviewer.lead")}
          </p>
        </div>
        <Link
          href={query ? `/reviewer/summary?${query}` : "/reviewer/summary"}
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          {t("reviewer.impact")}
        </Link>
      </div>
      <Flash error={params.error || parsed.error || insights.error} notice={params.notice} />

      <form
        method="get"
        action="/reviewer"
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("reviewer.group")}</span>
            <select
              className={fieldClassName}
              name="group_id"
              defaultValue={filters.groupId ?? ""}
              disabled={Boolean(scopedGroupId)}
            >
              {scopedGroupId ? null : <option value="">{t("reviewer.allGroups")}</option>}
              {insights.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {groupLabel(group.label, t)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("reviewer.training")}</span>
            <select
              className={fieldClassName}
              name="training_id"
              defaultValue={parsed.filters.trainingId ?? ""}
            >
              <option value="">{t("reviewer.allTrainings")}</option>
              {insights.trainings.map((training) => (
                <option key={training.id} value={training.id}>
                  {training.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("reviewer.status")}</span>
            <select
              className={fieldClassName}
              name="status"
              defaultValue={parsed.filters.status ?? ""}
            >
              <option value="">{t("reviewer.allStatuses")}</option>
              {COMPLETION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`reviewer.${status === "not_started" ? "notStarted" : status === "in_progress" ? "inProgress" : "completed"}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("reviewer.from")}</span>
            <input
              className={fieldClassName}
              type="date"
              name="from"
              defaultValue={parsed.filters.from ?? ""}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("reviewer.to")}</span>
            <input
              className={fieldClassName}
              type="date"
              name="to"
              defaultValue={parsed.filters.to ?? ""}
            />
          </label>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="submit" className="w-full sm:w-auto">
            {t("reviewer.apply")}
          </Button>
          {filtered && !scopedGroupId ? (
            <Link
              href="/reviewer"
              className={cn(buttonVariants({ variant: "ghost" }), "w-full sm:w-auto")}
            >
              {t("reviewer.clear")}
            </Link>
          ) : null}
          <Link
            href={`/api/reviewer/insights/export?${exportQuery}format=csv`}
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            title={t("reviewer.csvTitle")}
          >
            {t("reviewer.csv")}
          </Link>
          <Link
            href={query ? `/reviewer/summary?${query}` : "/reviewer/summary"}
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            {t("reviewer.impact")}
          </Link>
        </div>
      </form>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">{t("reviewer.distTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("reviewer.distLead")}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("reviewer.anonymized")}
          </p>
        </div>
        <div className="mt-5 space-y-5">
          {insights.training_distribution.length === 0 ? (
            <EmptyState
              framed={false}
              className="p-0"
              title={t("reviewer.noDistTitle")}
            >
              {t("reviewer.noDistBody")}
            </EmptyState>
          ) : (
            insights.training_distribution.map((training) => {
              const total =
                training.not_started + training.in_progress + training.completed;
              const pct = total === 0 ? 0 : Math.round((training.completed / total) * 100);
              return (
                <div key={training.title} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 font-medium">{training.title}</p>
                    <p className="shrink-0 text-sm tabular-nums text-muted-foreground">{pct}%</p>
                  </div>
                  <StackedBar
                    notStarted={training.not_started}
                    inProgress={training.in_progress}
                    completed={training.completed}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("reviewer.distCounts", {
                      completed: training.completed,
                      inProgress: training.in_progress,
                      notStarted: training.not_started,
                    })}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-semibold">{t("reviewer.tableTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("reviewer.tableCount", {
              shown: insights.rows.length,
              total: insights.participantCount,
            })}
            {" · "}
            {parsed.filters.trainingId
              ? t("reviewer.tableStatusSelected")
              : t("reviewer.tableStatusCatalog")}
            .
          </p>
        </div>
        {insights.rows.length === 0 ? (
          insights.participantCount === 0 ? (
            <EmptyState framed={false} title={t("reviewer.noCohortTitle")}>
              {t("reviewer.noCohortBody")}
            </EmptyState>
          ) : (
            <EmptyState
              framed={false}
              title={t("reviewer.noMatchTitle")}
              actionHref={filtered && !scopedGroupId ? "/reviewer" : undefined}
              actionLabel={filtered && !scopedGroupId ? t("reviewer.clear") : undefined}
            >
              {t("reviewer.noMatchBody")}
            </EmptyState>
          )
        ) : (
          <>
            <ul className="md:hidden">
              {insights.rows.map((row) => (
                <li
                  key={row.participantLabel}
                  className="border-b border-border last:border-0"
                >
                  <div className="grid gap-2 px-4 py-4 sm:px-6">
                    <span className="min-w-0">
                      <span className="block truncate font-medium tabular-nums">
                        {row.participantLabel}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {groupLabel(row.groupLabel, t)}
                      </span>
                    </span>
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("reviewer.statusCol")}</span>
                      <span className="text-right">
                        {statusLabel(row.completionStatus, t)}
                      </span>
                    </span>
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("reviewer.progress")}</span>
                      <span className="text-right">
                        {rowProgress(row, parsed.filters.trainingId, t)}
                      </span>
                    </span>
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("reviewer.lastActive")}</span>
                      <span className="text-right text-muted-foreground">
                        {row.activityWeek
                          ? t("reviewer.weekOf", { date: formatShortDate(row.activityWeek, locale) })
                          : t("common.emDash")}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="px-6 py-3 font-medium">{t("reviewer.participant")}</th>
                    <th className="px-4 py-3 font-medium">{t("reviewer.statusCol")}</th>
                    <th className="px-4 py-3 font-medium">{t("reviewer.progress")}</th>
                    <th className="px-6 py-3 font-medium">{t("reviewer.lastActivity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.rows.map((row) => (
                    <tr
                      key={row.participantLabel}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-6 py-3">
                        <p className="font-medium tabular-nums">{row.participantLabel}</p>
                        <p className="text-muted-foreground">{groupLabel(row.groupLabel, t)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {statusLabel(row.completionStatus, t)}
                      </td>
                      <td className="px-4 py-3">
                        {rowProgress(row, parsed.filters.trainingId, t)}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {row.activityWeek
                          ? t("reviewer.weekOf", { date: formatShortDate(row.activityWeek, locale) })
                          : t("common.emDash")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
