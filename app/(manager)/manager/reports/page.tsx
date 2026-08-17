import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { translateAssignmentStatus } from "@/lib/i18n/flash";
import { formatShortDate, getI18n } from "@/lib/i18n/server";
import {
  COMPLETION_STATUSES,
  loadManagerReport,
  parseReportSearchParams,
  reportQuery,
} from "@/lib/manager/reports";
import { fieldClassName, interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    training_id?: string;
    status?: string;
    from?: string;
    to?: string;
    error?: string;
    notice?: string;
  }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const { t, locale } = await getI18n();
  const parsed = parseReportSearchParams(params);
  const report = await loadManagerReport(user.id, parsed.filters);
  const query = reportQuery(parsed.filters);
  const exportQuery = query ? `${query}&` : "";
  const hasFilters = Boolean(
    parsed.filters.trainingId ||
      parsed.filters.status ||
      parsed.filters.from ||
      parsed.filters.to
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("manager.reports.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.reports.lead")}
          </p>
        </div>
        <Link
          href="/manager/impact"
          className={cn(buttonVariants({ variant: "outline" }), "w-full shrink-0 sm:w-auto")}
        >
          {t("manager.reports.impact")}
        </Link>
      </div>
      <Flash error={params.error || parsed.error || report.error} notice={params.notice} />

      <form
        method="get"
        action="/manager/reports"
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("manager.reports.training")}</span>
            <select
              className={fieldClassName}
              name="training_id"
              defaultValue={parsed.filters.trainingId ?? ""}
            >
              <option value="">{t("manager.reports.allTrainings")}</option>
              {report.trainings.map((training) => (
                <option key={training.id} value={training.id}>
                  {training.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("manager.reports.status")}</span>
            <select
              className={fieldClassName}
              name="status"
              defaultValue={parsed.filters.status ?? ""}
            >
              <option value="">{t("manager.reports.allStatuses")}</option>
              {COMPLETION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {translateAssignmentStatus(status, t)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("manager.reports.from")}</span>
            <input
              className={fieldClassName}
              type="date"
              name="from"
              defaultValue={parsed.filters.from ?? ""}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("manager.reports.to")}</span>
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
            {t("manager.reports.apply")}
          </Button>
          {hasFilters ? (
            <Link
              href="/manager/reports"
              className={cn(buttonVariants({ variant: "ghost" }), "w-full sm:w-auto")}
            >
              {t("manager.reports.clear")}
            </Link>
          ) : null}
          <Link
            href={`/api/manager/reports/export?${exportQuery}format=csv`}
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            {t("manager.reports.csv")}
          </Link>
          <Link
            href={`/api/manager/reports/export?${exportQuery}format=pdf`}
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            {t("manager.reports.pdf")}
          </Link>
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-semibold">{t("manager.reports.preview")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {parsed.filters.trainingId
              ? t("manager.reports.countSelected", {
                  shown: report.rows.length,
                  total: report.participantCount,
                })
              : t("manager.reports.countCatalog", {
                  shown: report.rows.length,
                  total: report.participantCount,
                })}
          </p>
        </div>
        {report.rows.length === 0 ? (
          report.participantCount === 0 ? (
            <EmptyState
              framed={false}
              title={t("manager.reports.emptyTitle")}
              actionHref="/manager"
              actionLabel={t("manager.participants.openDashboard")}
            >
              {t("manager.reports.emptyBody")}
            </EmptyState>
          ) : (
            <EmptyState
              framed={false}
              title={t("manager.reports.noMatchTitle")}
              actionHref={hasFilters ? "/manager/reports" : undefined}
              actionLabel={hasFilters ? t("manager.reports.clear") : undefined}
            >
              {t("manager.reports.noMatchBody")}
            </EmptyState>
          )
        ) : (
          <>
            <ul className="md:hidden">
              {report.rows.map((row) => (
                <li key={row.fatherId} className="border-b border-border last:border-0">
                  <Link
                    href={`/manager/participants/${row.fatherId}`}
                    className={cn("block space-y-2 px-4 py-4", interactiveSurfaceClassName)}
                  >
                    <p className="font-medium">{row.name}</p>
                    <p className="text-sm text-muted-foreground">{row.groupName}</p>
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("manager.reports.profile")}</span>
                      <span>{translateAssignmentStatus(row.profileStatus === "not_started" ? "not_started" : row.profileStatus === "in_progress" ? "in_progress" : "completed", t)}</span>
                    </p>
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("manager.reports.statusCol")}</span>
                      <span>{translateAssignmentStatus(row.completionStatus, t)}</span>
                    </p>
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("manager.reports.trainings")}</span>
                      <span className="text-right">
                        {row.assignmentTitles.join(", ") || t("manager.reports.noneAssigned")}
                      </span>
                    </p>
                    {row.certificateSerials ? (
                      <p className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{t("manager.reports.serials")}</span>
                        <span className="text-right font-mono text-xs">
                          {row.certificateSerials}
                        </span>
                      </p>
                    ) : null}
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("manager.reports.lastActive")}</span>
                      <span>{formatShortDate(row.lastActivity, locale)}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="px-6 py-3 font-medium">{t("manager.reports.name")}</th>
                    <th className="px-4 py-3 font-medium">{t("manager.reports.profile")}</th>
                    <th className="px-4 py-3 font-medium">{t("manager.reports.statusCol")}</th>
                    <th className="px-4 py-3 font-medium">{t("manager.reports.assignments")}</th>
                    <th className="px-4 py-3 font-medium">{t("manager.reports.serials")}</th>
                    <th className="px-6 py-3 font-medium">{t("manager.reports.lastActivity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr
                      key={row.fatherId}
                      className="border-b border-border transition-[color,background-color] duration-150 ease-out last:border-0 hover:bg-white/5"
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/manager/participants/${row.fatherId}`}
                          className={cn("font-medium", interactiveLinkClassName)}
                        >
                          {row.name}
                        </Link>
                        <p className="text-muted-foreground">{row.groupName}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {translateAssignmentStatus(
                          row.profileStatus === "not_started"
                            ? "not_started"
                            : row.profileStatus === "in_progress"
                              ? "in_progress"
                              : "completed",
                          t
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {translateAssignmentStatus(row.completionStatus, t)}
                      </td>
                      <td className="px-4 py-3">
                        {row.assignmentTitles.join("; ") || t("manager.reports.noneAssigned")}
                        <p className="text-xs text-muted-foreground">{row.progressDetail}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {row.certificateSerials || "—"}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {formatShortDate(row.lastActivity, locale)}
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
