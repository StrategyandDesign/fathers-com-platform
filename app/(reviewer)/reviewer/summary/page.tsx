import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { PrintButton } from "@/components/manager/print-button";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import type { Translate } from "@/lib/i18n/translate";
import { insightQuery, parseInsightSearchParams } from "@/lib/reviewer/insights";
import { loadReviewerImpactSummary } from "@/lib/reviewer/summary";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function translateGroupLabel(label: string, t: Translate) {
  const match = label.match(/^Group (\d+)$/);
  if (match) return t("reviewer.groupLabel", { n: match[1] });
  if (label === "Group") return t("reviewer.group");
  return label;
}

export default async function ReviewerImpactSummaryPage({
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
  await requireRole("reviewer");
  const { t, locale } = await getI18n();
  const parsed = parseInsightSearchParams(params);
  const { insights, summary, certificateError } = await loadReviewerImpactSummary(
    parsed.filters
  );
  const query = insightQuery(parsed.filters);
  const exportQuery = query ? `${query}&` : "";
  const backHref = query ? `/reviewer?${query}` : "/reviewer";

  const groupFilter =
    parsed.filters.groupId == null
      ? t("reviewer.allGroups")
      : insights.groups.find((row) => row.id === parsed.filters.groupId)?.label ??
        t("reviewer.summary.selectedGroup");
  const trainingFilter =
    parsed.filters.trainingId == null
      ? t("reviewer.allTrainings")
      : insights.trainings.find((row) => row.id === parsed.filters.trainingId)?.title ??
        t("reviewer.summary.selectedTraining");
  const statusFilter = parsed.filters.status
    ? parsed.filters.status === "completed"
      ? t("reviewer.completed")
      : parsed.filters.status === "in_progress"
        ? t("reviewer.inProgress")
        : t("reviewer.notStarted")
    : t("reviewer.summary.allStatuses");
  const rangeFilter =
    parsed.filters.from || parsed.filters.to
      ? t("reviewer.summary.rangeTo", {
          from: parsed.filters.from ?? "…",
          to: parsed.filters.to ?? "…",
        })
      : t("reviewer.summary.anyDate");
  const filterLines = [
    t("reviewer.summary.groupLine", { value: translateGroupLabel(groupFilter, t) }),
    t("reviewer.summary.trainingLine", { value: trainingFilter }),
    t("reviewer.summary.statusLine", { value: statusFilter }),
    t("reviewer.summary.lastActivity", { range: rangeFilter }),
  ];

  const metrics = [
    {
      label: t("reviewer.summary.participants"),
      value: String(summary.totalParticipants),
      detail: t("reviewer.summary.participantsDetail"),
    },
    {
      label: t("reviewer.summary.startRate"),
      value: `${summary.startedPct}%`,
      detail: t("reviewer.summary.startDetail", {
        count: summary.startedCount,
        total: summary.totalParticipants,
      }),
    },
    {
      label: t("reviewer.summary.oneSession"),
      value: `${summary.oneSessionPct}%`,
      detail: t("reviewer.summary.oneSessionDetail", { count: summary.oneSessionCount }),
    },
    {
      label: t("reviewer.summary.fully"),
      value: `${summary.fullyCompletedPct}%`,
      detail: t("reviewer.summary.fullyDetail", { count: summary.fullyCompletedCount }),
    },
    {
      label: t("reviewer.summary.certs"),
      value: String(summary.certificatesIssued),
      detail: t("reviewer.summary.certsDetail"),
    },
  ];

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground print:hidden">
        <Link href={backHref} className={interactiveLinkClassName}>
          {t("reviewer.title")}
        </Link>
        <span className="text-white/20">|</span>
        <span>{t("reviewer.summary.crumb")}</span>
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            {t("reviewer.summary.kicker")}
          </p>
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
            {t("reviewer.summary.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("reviewer.summary.lead", { date: formatLongDate(summary.generatedAt, locale) })}
          </p>
        </div>
        <div className="flex flex-col gap-2 print:hidden sm:flex-row">
          <Link
            href={`/api/reviewer/summary/export?${exportQuery}format=pdf`}
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            {t("reviewer.summary.pdf")}
          </Link>
          <PrintButton />
        </div>
      </div>
      <Flash
        error={params.error || parsed.error || insights.error || certificateError || undefined}
        notice={params.notice}
      />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">{t("reviewer.summary.filters")}</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {filterLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      {summary.totalParticipants === 0 ? (
        <EmptyState
          title={t("reviewer.summary.emptyTitle")}
          actionHref={backHref}
          actionLabel={t("reviewer.summary.backInsights")}
        >
          {t("reviewer.summary.emptyBody")}
        </EmptyState>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold tabular-nums">{metric.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{metric.detail}</p>
            </div>
          ))}
        </section>
      )}

      {summary.trend ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("reviewer.summary.periodTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.trend.unit === "completion rate"
              ? t("reviewer.summary.periodCompletion")
              : t("reviewer.summary.periodProfiles")}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border px-4 py-4">
              <p className="text-sm text-muted-foreground">{summary.trend.leftLabel}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {summary.trend.left}
                {summary.trend.unit === "completion rate" ? "%" : ""}
              </p>
            </div>
            <div className="rounded-lg border border-border px-4 py-4">
              <p className="text-sm text-muted-foreground">{summary.trend.rightLabel}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {summary.trend.right}
                {summary.trend.unit === "completion rate" ? "%" : ""}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {summary.groups.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-4 sm:px-6">
            <h2 className="font-heading text-lg font-semibold">{t("reviewer.summary.groupTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("reviewer.summary.groupLead")}
            </p>
          </div>
          <ul className="divide-y divide-border sm:hidden">
            {summary.groups.map((group) => (
              <li key={group.label} className="space-y-2 px-4 py-4">
                <p className="font-medium">{translateGroupLabel(group.label, t)}</p>
                <p className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("reviewer.summary.enrolled")}</span>
                  <span className="tabular-nums">{group.enrolled}</span>
                </p>
                <p className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("reviewer.summary.started")}</span>
                  <span className="tabular-nums">{group.startedPct}%</span>
                </p>
                <p className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("reviewer.summary.oneSessionCol")}</span>
                  <span className="tabular-nums">{group.oneSessionPct}%</span>
                </p>
                <p className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("reviewer.summary.completed")}</span>
                  <span className="tabular-nums">{group.fullyCompletedPct}%</span>
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-6 py-3 font-medium">{t("reviewer.summary.group")}</th>
                  <th className="px-4 py-3 font-medium">{t("reviewer.summary.enrolled")}</th>
                  <th className="px-4 py-3 font-medium">{t("reviewer.summary.started")}</th>
                  <th className="px-4 py-3 font-medium">{t("reviewer.summary.oneSessionCol")}</th>
                  <th className="px-6 py-3 font-medium">{t("reviewer.summary.completed")}</th>
                </tr>
              </thead>
              <tbody>
                {summary.groups.map((group) => (
                  <tr key={group.label} className="border-b border-border last:border-0">
                    <td className="px-6 py-3 font-medium">{translateGroupLabel(group.label, t)}</td>
                    <td className="px-4 py-3 tabular-nums">{group.enrolled}</td>
                    <td className="px-4 py-3 tabular-nums">{group.startedPct}%</td>
                    <td className="px-4 py-3 tabular-nums">{group.oneSessionPct}%</td>
                    <td className="px-6 py-3 tabular-nums">{group.fullyCompletedPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {t("reviewer.summary.footer")}
      </p>
    </div>
  );
}
