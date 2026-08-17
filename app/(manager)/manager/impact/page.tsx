import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { PrintButton } from "@/components/manager/print-button";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth/session";
import { loadManagerImpact, trendLabel } from "@/lib/manager/impact";
import { cn } from "@/lib/utils";

function formatGeneratedAt(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function TrendDelta({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous;
  return (
    <p
      className={cn(
        "text-sm tabular-nums",
        delta > 0 ? "text-primary" : "text-muted-foreground"
      )}
    >
      {trendLabel(current, previous)}
    </p>
  );
}

export default async function ManagerImpactPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const snapshot = await loadManagerImpact(user.id);
  const organization =
    snapshot.organizationNames.length > 0
      ? snapshot.organizationNames.join(", ")
      : "Your organization";

  const metrics = [
    {
      label: "Fathers enrolled",
      value: String(snapshot.enrolled),
      detail: "Current members in your group",
    },
    {
      label: "Started training",
      value: `${snapshot.startedTrainingPct}%`,
      detail: `${snapshot.startedTraining} of ${snapshot.enrolled} began a session`,
      bar: snapshot.startedTrainingPct,
    },
    {
      label: "Completed a session",
      value: `${snapshot.completedOneSessionPct}%`,
      detail: `${snapshot.completedOneSession} of ${snapshot.enrolled} finished at least one`,
      bar: snapshot.completedOneSessionPct,
    },
    {
      label: "Fully completed",
      value: `${snapshot.fullyCompletedPct}%`,
      detail: `${snapshot.fullyCompleted} of ${snapshot.enrolled} finished a training`,
      bar: snapshot.fullyCompletedPct,
    },
    {
      label: "Certificates issued",
      value: String(snapshot.certificatesIssued),
      detail: "Certificates sent from your group",
    },
    {
      label: "Currently active",
      value: String(snapshot.activeParticipants),
      detail: `Last activity in the past ${snapshot.periodDays} days`,
    },
  ];

  const trendRows = [
    { label: "New enrollments", count: snapshot.trend.enrolled },
    { label: "Sessions completed", count: snapshot.trend.sessionsCompleted },
    { label: "Certificates issued", count: snapshot.trend.certificatesIssued },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            {organization}
          </p>
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
            Impact Snapshot
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One page of numbers for a board, funder, or leader. Your organization
            only. Generated {formatGeneratedAt(snapshot.generatedAt)}.
          </p>
        </div>
        <div className="flex flex-col gap-2 print:hidden sm:flex-row">
          <Link
            href="/api/manager/impact/export"
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            Download PDF
          </Link>
          <Link
            href="/manager/compare"
            className={cn(buttonVariants({ variant: "outline" }), "w-full print:hidden sm:w-auto")}
          >
            Compare
          </Link>
          <PrintButton />
        </div>
      </div>
      <Flash error={params.error} notice={params.notice} />

      {snapshot.enrolled === 0 ? (
        <EmptyState
          title="No one has joined yet"
          actionHref="/manager"
          actionLabel="Open dashboard"
        >
          Share your invite code from the Dashboard. This snapshot fills in after
          someone joins {organization}.
        </EmptyState>
      ) : (
        <>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold tabular-nums">{metric.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{metric.detail}</p>
              {metric.bar != null ? <ProgressBar value={metric.bar} className="mt-4" /> : null}
            </div>
          ))}
        </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">This period vs previous</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Last {snapshot.periodDays} days ({snapshot.currentRangeLabel}) compared with{" "}
          {snapshot.previousRangeLabel}.
        </p>
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {trendRows.map((row) => (
            <li
              key={row.label}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{row.label}</p>
                <p className="text-sm text-muted-foreground">
                  {row.count.previous} in the previous {snapshot.periodDays} days
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xl font-semibold tabular-nums">{row.count.current}</p>
                <TrendDelta current={row.count.current} previous={row.count.previous} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {snapshot.trainings.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">By training</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How {organization} sits in each catalog training.
          </p>
          <ul className="mt-5 space-y-5">
            {snapshot.trainings.map((training) => (
              <li key={training.title} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium">{training.title}</p>
                  <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {training.fullyCompleted} complete
                  </p>
                </div>
                <ProgressBar
                  value={
                    snapshot.enrolled === 0
                      ? 0
                      : Math.round((training.fullyCompleted / snapshot.enrolled) * 100)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {training.started} started · {training.completedOneSession} completed a
                  session · {training.fullyCompleted} fully completed
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
        </>
      )}

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">How to read these numbers</h2>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Started training</span> — began
            film, check-in, or action in any session.
          </li>
          <li>
            <span className="font-medium text-foreground">Completed a session</span> —
            finished film, check-in, and action for at least one session.
          </li>
          <li>
            <span className="font-medium text-foreground">Fully completed</span> — finished
            every session in at least one training.
          </li>
          <li>
            <span className="font-medium text-foreground">Currently active</span> — last
            join, profile, session, assignment, or certificate activity in the past{" "}
            {snapshot.periodDays} days.
          </li>
        </ul>
        <Link
          href="/manager/reports"
          className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full print:hidden sm:w-auto")}
        >
          Open detailed reports
        </Link>
      </section>
    </div>
  );
}
