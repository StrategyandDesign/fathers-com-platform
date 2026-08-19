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
  const { user } = await requireRole("manager");
  const { t, locale } = await getI18n();
  const parsed = parseReportSearchParams(params);
  const report = await loadManagerReport(user.id, parsed.filters);
  const query = reportQuery(parsed.filters);
  const exportQuery = query ? `${query}&` : "";
  const hasFilters = Boolean(
    parsed.filters.groupId ||
      parsed.filters.trainingId ||
      parsed.filters.status ||
      parsed.filters.from ||
      parsed.filters.to
  );
  const tiles = [
    { label: t("manager.reports.tileMen"), value: report.summary.men },
    { label: t("manager.reports.tileCompleted"), value: report.summary.completed },
    { label: t("manager.reports.tileInProgress"), value: report.summary.inProgress },
    { label: t("manager.reports.tileNotStarted"), value: report.summary.notStarted },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("manager.reports.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("manager.reports.lead")}</p>
        </div>
        <Link
          href="/manager/impact"
          className={cn(buttonVariants({ variant: "outline" }), "w-full shrink-0 sm:w-auto")}
        >
          {t("manager.reports.impact")}
        </Link>
      </div>
      <Flash error={params.error || parsed.error || report.error} notice={params.notice} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">{tile.label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold">{tile.value}</p>
          </div>
        ))}
      </section>
      <p className="text-sm text-muted-foreground">{t("manager.reports.definitions")}</p>

      <form
        method="get"
        action="/manager/reports"
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {report.groups.length > 1 ? (
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">{t("manager.reports.group")}</span>
              <select
                className={fieldClassName}
                name="group_id"
                defaultValue={parsed.filters.groupId ?? ""}
              >
                <option value="">{t("manager.reports.allGroups")}</option>
                {report.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
            className={cn(buttonVariants(), "w-full sm:w-auto")}
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
            {t("manager.reports.countRows", {
              shown: report.rows.length,
              men: report.summary.men,
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
                <li
                  key={`${row.fatherId}:${row.trainingId ?? "none"}:${row.groupId}`}
                  className="border-b border-border last:border-0"
                >
                  <Link
                    href={`/manager/participants/${row.fatherId}`}
                    className={cn("block space-y-2 px-4 py-4", interactiveSurfaceClassName)}
                  >
                    <p className="font-medium">{row.name}</p>
                    <p className="text-sm text-muted-foreground">{row.groupName}</p>
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("manager.reports.trainingCol")}</span>
                      <span className="text-right">
                        {row.trainingTitle === "None assigned"
                          ? t("manager.reports.noneAssigned")
                          : row.trainingTitle}
                      </span>
                    </p>
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("manager.reports.statusCol")}</span>
                      <span>{translateAssignmentStatus(row.completionStatus, t)}</span>
                    </p>
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("manager.reports.sessionsCol")}</span>
                      <span>
                        {t("manager.reports.sessionsProgress", {
                          completed: row.sessionsCompleted,
                          total: row.sessionsTotal,
                        })}
                      </span>
                    </p>
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("manager.reports.skillsUsed")}</span>
                      <span>{row.skillsUsed}</span>
                    </p>
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t("manager.reports.csvCompletedOn")}</span>
                      <span>{formatShortDate(row.completedAt, locale)}</span>
                    </p>
                    {row.certificateSerial ? (
                      <p className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{t("manager.reports.serials")}</span>
                        <span className="text-right font-mono text-xs">{row.certificateSerial}</span>
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[60rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="px-6 py-3 font-medium">{t("manager.reports.name")}</th>
                    <th className="px-4 py-3 font-medium">{t("manager.reports.trainingCol")}</th>
                    <th className="px-4 py-3 font-medium">{t("manager.reports.statusCol")}</th>
                    <th className="px-4 py-3 font-medium">{t("manager.reports.sessionsCol")}</th>
                    <th className="px-4 py-3 font-medium">{t("manager.reports.skillsUsed")}</th>
                    <th className="px-4 py-3 font-medium">{t("manager.reports.csvCompletedOn")}</th>
                    <th className="px-6 py-3 font-medium">{t("manager.reports.serials")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr
                      key={`${row.fatherId}:${row.trainingId ?? "none"}:${row.groupId}`}
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
                      <td className="px-4 py-3">
                        {row.trainingTitle === "None assigned"
                          ? t("manager.reports.noneAssigned")
                          : row.trainingTitle}
                      </td>
                      <td className="px-4 py-3">
                        {translateAssignmentStatus(row.completionStatus, t)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.sessionsCompleted}/{row.sessionsTotal}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.skillsUsed}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatShortDate(row.completedAt, locale)}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {row.certificateSerial || t("common.emDash")}
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
