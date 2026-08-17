import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { PrintButton } from "@/components/manager/print-button";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { insightQuery, parseInsightSearchParams } from "@/lib/reviewer/insights";
import { loadReviewerImpactSummary } from "@/lib/reviewer/summary";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function formatGeneratedAt(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
  const parsed = parseInsightSearchParams(params);
  const { insights, summary, certificateError } = await loadReviewerImpactSummary(
    parsed.filters
  );
  const query = insightQuery(parsed.filters);
  const exportQuery = query ? `${query}&` : "";
  const backHref = query ? `/reviewer?${query}` : "/reviewer";

  const metrics = [
    {
      label: "Participants",
      value: String(summary.totalParticipants),
      detail: "People in this filtered cohort",
    },
    {
      label: "Start rate",
      value: `${summary.startedPct}%`,
      detail: `${summary.startedCount} of ${summary.totalParticipants} began a session`,
    },
    {
      label: "Completed a session",
      value: `${summary.oneSessionPct}%`,
      detail: `${summary.oneSessionCount} finished at least one session`,
    },
    {
      label: "Fully completed",
      value: `${summary.fullyCompletedPct}%`,
      detail: `${summary.fullyCompletedCount} finished a training`,
    },
    {
      label: "Certificates issued",
      value: String(summary.certificatesIssued),
      detail: "Completion certificates on file",
    },
  ];

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground print:hidden">
        <Link href={backHref} className={interactiveLinkClassName}>
          Insights
        </Link>
        <span className="text-white/20">|</span>
        <span>Impact Summary</span>
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            Anonymized · Fathers.com
          </p>
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
            Impact Summary
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Program outcomes for a board, funder, or leadership update. Counts
            only. Generated {formatGeneratedAt(summary.generatedAt)}.
          </p>
        </div>
        <div className="flex flex-col gap-2 print:hidden sm:flex-row">
          <Link
            href={`/api/reviewer/summary/export?${exportQuery}format=pdf`}
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            Download PDF
          </Link>
          <PrintButton />
        </div>
      </div>
      <Flash
        error={params.error || parsed.error || insights.error || certificateError || undefined}
        notice={params.notice}
      />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Filters applied</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {summary.filterLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      {summary.totalParticipants === 0 ? (
        <EmptyState
          title="No cohort in this filter"
          actionHref={backHref}
          actionLabel="Back to Insights"
        >
          Adjust the Insights filters, then open Impact Summary again. This page
          never includes names or emails.
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
          <h2 className="font-heading text-lg font-semibold">Period comparison</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.trend.unit === "completion rate"
              ? "Share of the cohort who fully completed, earlier activity vs later."
              : "Profile completions in the first half of the recent window vs the second."}
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
            <h2 className="font-heading text-lg font-semibold">Group comparison</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anonymized groups only. No participant identifiers.
            </p>
          </div>
          <ul className="divide-y divide-border sm:hidden">
            {summary.groups.map((group) => (
              <li key={group.label} className="space-y-2 px-4 py-4">
                <p className="font-medium">{group.label}</p>
                <p className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Enrolled</span>
                  <span className="tabular-nums">{group.enrolled}</span>
                </p>
                <p className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Started</span>
                  <span className="tabular-nums">{group.startedPct}%</span>
                </p>
                <p className="flex justify-between text-sm">
                  <span className="text-muted-foreground">One session</span>
                  <span className="tabular-nums">{group.oneSessionPct}%</span>
                </p>
                <p className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="tabular-nums">{group.fullyCompletedPct}%</span>
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-6 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">Enrolled</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">One session</th>
                  <th className="px-6 py-3 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {summary.groups.map((group) => (
                  <tr key={group.label} className="border-b border-border last:border-0">
                    <td className="px-6 py-3 font-medium">{group.label}</td>
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
        This summary contains no names, emails, avatars, or certificate serials.
        It is safe to share with a board or funder.
      </p>
    </div>
  );
}
