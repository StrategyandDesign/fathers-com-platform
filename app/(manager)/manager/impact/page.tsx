import Link from "next/link";

import { CompanionNarrative } from "@/components/manager/companion-narrative";
import { Flash } from "@/components/manager/flash";
import { PrintButton } from "@/components/manager/print-button";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth/session";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import type { Translate } from "@/lib/i18n/translate";
import { loadManagerImpact } from "@/lib/manager/impact";
import { cn } from "@/lib/utils";

function TrendDelta({
  current,
  previous,
  t,
}: {
  current: number;
  previous: number;
  t: Translate;
}) {
  const delta = current - previous;
  const label =
    delta === 0
      ? t("manager.impact.same")
      : delta > 0
        ? t("manager.impact.plus", { n: delta })
        : t("manager.impact.minus", { n: Math.abs(delta) });
  return (
    <p
      className={cn(
        "text-sm tabular-nums",
        delta > 0 ? "text-primary" : "text-muted-foreground"
      )}
    >
      {label}
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
  const { t, locale } = await getI18n();
  const snapshot = await loadManagerImpact(user.id, locale);
  const organization =
    snapshot.organizationNames.length > 0
      ? snapshot.organizationNames.join(", ")
      : t("manager.impact.yourOrg");

  const metrics = [
    {
      label: t("manager.impact.enrolled"),
      value: String(snapshot.enrolled),
      detail: t("manager.impact.enrolledDetail"),
    },
    {
      label: t("manager.impact.started"),
      value: `${snapshot.startedTrainingPct}%`,
      detail: t("manager.impact.startedDetail", {
        started: snapshot.startedTraining,
        enrolled: snapshot.enrolled,
      }),
      bar: snapshot.startedTrainingPct,
    },
    {
      label: t("manager.impact.oneSession"),
      value: `${snapshot.completedOneSessionPct}%`,
      detail: t("manager.impact.oneSessionDetail", {
        count: snapshot.completedOneSession,
        enrolled: snapshot.enrolled,
      }),
      bar: snapshot.completedOneSessionPct,
    },
    {
      label: t("manager.impact.fully"),
      value: `${snapshot.fullyCompletedPct}%`,
      detail: t("manager.impact.fullyDetail", {
        count: snapshot.fullyCompleted,
        enrolled: snapshot.enrolled,
      }),
      bar: snapshot.fullyCompletedPct,
    },
    {
      label: t("manager.impact.certs"),
      value: String(snapshot.certificatesIssued),
      detail: t("manager.impact.certsDetail"),
    },
    {
      label: t("manager.impact.active"),
      value: String(snapshot.activeParticipants),
      detail: t("manager.impact.activeDetail", { days: snapshot.periodDays }),
    },
  ];

  const trendRows = [
    { label: t("manager.impact.newEnrollments"), count: snapshot.trend.enrolled },
    { label: t("manager.impact.sessionsCompleted"), count: snapshot.trend.sessionsCompleted },
    { label: t("manager.impact.certs"), count: snapshot.trend.certificatesIssued },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            {organization}
          </p>
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
            {t("manager.impact.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.impact.lead", { date: formatLongDate(snapshot.generatedAt, locale) })}
          </p>
        </div>
        <div className="flex flex-col gap-2 print:hidden sm:flex-row">
          <Link
            href="/api/manager/impact/export"
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            {t("manager.impact.pdf")}
          </Link>
          <Link
            href="/manager/compare"
            className={cn(buttonVariants({ variant: "outline" }), "w-full print:hidden sm:w-auto")}
          >
            {t("manager.impact.compare")}
          </Link>
          <PrintButton />
        </div>
      </div>
      <Flash error={params.error} notice={params.notice} />
      <CompanionNarrative snapshot={snapshot} organization={organization} t={t} />

      {snapshot.enrolled === 0 ? (
        <EmptyState
          title={t("manager.impact.emptyTitle")}
          actionHref="/manager"
          actionLabel={t("manager.participants.openDashboard")}
        >
          {t("manager.impact.emptyBody", { org: organization })}
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
        <h2 className="font-heading text-lg font-semibold">{t("manager.impact.periodTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.impact.periodLead", {
            days: snapshot.periodDays,
            current: snapshot.currentRangeLabel,
            previous: snapshot.previousRangeLabel,
          })}
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
                  {t("manager.impact.previousDays", {
                    count: row.count.previous,
                    days: snapshot.periodDays,
                  })}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xl font-semibold tabular-nums">{row.count.current}</p>
                <TrendDelta current={row.count.current} previous={row.count.previous} t={t} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {snapshot.trainings.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("manager.impact.byTraining")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.impact.byTrainingLead", { org: organization })}
          </p>
          <ul className="mt-5 space-y-5">
            {snapshot.trainings.map((training) => (
              <li key={training.title} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium">{training.title}</p>
                  <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {t("manager.impact.completeCount", { count: training.fullyCompleted })}
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
                  {t("manager.impact.trainingBreakdown", {
                    started: training.started,
                    one: training.completedOneSession,
                    fully: training.fullyCompleted,
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
        </>
      )}

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">{t("manager.impact.howTitle")}</h2>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">{t("manager.impact.howStarted")}</span>
            {". "}
            {t("manager.impact.howStartedBody")}
          </li>
          <li>
            <span className="font-medium text-foreground">{t("manager.impact.howOne")}</span>
            {". "}
            {t("manager.impact.howOneBody")}
          </li>
          <li>
            <span className="font-medium text-foreground">{t("manager.impact.howFully")}</span>
            {". "}
            {t("manager.impact.howFullyBody")}
          </li>
          <li>
            <span className="font-medium text-foreground">{t("manager.impact.howActive")}</span>
            {". "}
            {t("manager.impact.howActiveBody", { days: snapshot.periodDays })}
          </li>
        </ul>
        <Link
          href="/manager/reports"
          className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full print:hidden sm:w-auto")}
        >
          {t("manager.impact.openReports")}
        </Link>
      </section>
    </div>
  );
}
