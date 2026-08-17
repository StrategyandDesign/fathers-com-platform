import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { resolveUserLocale } from "@/lib/i18n/resolve";
import {
  COMPLETION_STATUS_LABEL,
  COMPLETION_STATUSES,
  PROFILE_STATUS_LABEL,
  formatActivityWeek,
  hasInsightFilters,
  insightQuery,
  loadReviewerInsights,
  parseInsightSearchParams,
  progressLabel,
} from "@/lib/reviewer/insights";
import { fieldClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function formatWeek(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Bar({ value, max }: { value: number; max: number }) {
  const percent = max <= 0 ? 0 : Math.round((value / max) * 100);
  return <ProgressBar value={percent} />;
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
    return <div className="h-1.5 rounded-full bg-white/10" />;
  }

  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
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
  const { t } = await getI18n();
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
  const trendMax = Math.max(1, ...insights.completion_trend.map((point) => point.count));
  const edgeMax = Math.max(1, ...insights.primary_edges.map((edge) => edge.count));

  const stats = [
    { label: t("reviewer.total"), value: String(insights.total_participants) },
    {
      label: t("reviewer.profiles"),
      value: `${insights.profiles_completed_pct}%`,
      detail: t("reviewer.profilesDetail", {
        completed: insights.profiles_completed,
        total: insights.total_participants,
      }),
    },
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
                  {group.label}
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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{stat.value}</p>
            {"detail" in stat && stat.detail ? (
              <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
            ) : null}
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Profile completion trend</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Weekly Profile completions, last six weeks.
          </p>
          <div className="mt-5 space-y-3">
            {insights.completion_trend.length === 0 ? (
              <EmptyState
                framed={false}
                className="p-0"
                title="No weekly totals yet"
              >
                {insights.total_participants === 0
                  ? "These bars fill in after fathers finish a Profile."
                  : "No Profile completions in the last six weeks."}
              </EmptyState>
            ) : (
              insights.completion_trend.map((point) => (
                <div key={point.week} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{formatWeek(point.week)}</span>
                    <span className="tabular-nums text-muted-foreground">{point.count}</span>
                  </div>
                  <Bar value={point.count} max={trendMax} />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Most common Primary Edges</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Counts from completed Profiles only.
          </p>
          <div className="mt-5 space-y-3">
            {insights.primary_edges.length === 0 ? (
              <EmptyState
                framed={false}
                className="p-0"
                title="No Primary Edges yet"
              >
                {insights.total_participants === 0
                  ? "Edges appear after fathers complete a Profile."
                  : "No completed Profiles in this filter have a Primary Edge yet."}
              </EmptyState>
            ) : (
              insights.primary_edges.map((edge) => (
                <div key={edge.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{edge.label}</span>
                    <span className="tabular-nums text-muted-foreground">{edge.count}</span>
                  </div>
                  <Bar value={edge.count} max={edgeMax} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Training progress distribution</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              How the cohort sits in each training.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            All data is anonymized and aggregated.
          </p>
        </div>
        <div className="mt-5 space-y-5">
          {insights.training_distribution.length === 0 ? (
            <EmptyState
              framed={false}
              className="p-0"
              title="No trainings in the catalog"
            >
              Distribution appears once trainings are published.
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
                    {training.completed} complete · {training.in_progress} in progress ·{" "}
                    {training.not_started} not started
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-semibold">Anonymized progress</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {insights.rows.length} of {insights.participantCount} participants
            {parsed.filters.trainingId
              ? " · status is for the selected training"
              : " · status is across the catalog"}
            .
          </p>
        </div>
        {insights.rows.length === 0 ? (
          insights.participantCount === 0 ? (
            <EmptyState framed={false} title="No cohort data yet">
              Totals stay at zero until fathers join a group and start a Profile
              or training. This view stays anonymized.
            </EmptyState>
          ) : (
            <EmptyState
              framed={false}
              title="No matching participants"
              actionHref={filtered ? "/reviewer" : undefined}
              actionLabel={filtered ? "Clear filters" : undefined}
            >
              No one matches these filters. Clear them to see the full cohort.
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
                        {row.groupLabel}
                      </span>
                    </span>
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Profile</span>
                      <span className="text-right text-muted-foreground">
                        {PROFILE_STATUS_LABEL[row.profileStatus]}
                      </span>
                    </span>
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="text-right">
                        {COMPLETION_STATUS_LABEL[row.completionStatus]}
                      </span>
                    </span>
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-right">
                        {progressLabel(row, parsed.filters.trainingId)}
                      </span>
                    </span>
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Last active</span>
                      <span className="text-right text-muted-foreground">
                        {formatActivityWeek(row.activityWeek)}
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
                    <th className="px-6 py-3 font-medium">Participant</th>
                    <th className="px-4 py-3 font-medium">Profile</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Progress</th>
                    <th className="px-6 py-3 font-medium">Last activity</th>
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
                        <p className="text-muted-foreground">{row.groupLabel}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {PROFILE_STATUS_LABEL[row.profileStatus]}
                      </td>
                      <td className="px-4 py-3">
                        {COMPLETION_STATUS_LABEL[row.completionStatus]}
                      </td>
                      <td className="px-4 py-3">
                        {progressLabel(row, parsed.filters.trainingId)}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {formatActivityWeek(row.activityWeek)}
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
