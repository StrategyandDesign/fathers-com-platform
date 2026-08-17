import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import {
  COMPLETION_STATUS_LABEL,
  COMPLETION_STATUSES,
  PROFILE_STATUS_LABEL,
  loadManagerReport,
  parseReportSearchParams,
  reportQuery,
} from "@/lib/manager/reports";
import { formatShortDate } from "@/lib/manager/types";
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
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Export fathers in your group. Date range filters last activity (join, profile,
            session, assignment, or certificate). Email is omitted — it is not on profiles,
            and managers cannot read auth emails under RLS.
          </p>
        </div>
        <Link
          href="/manager/impact"
          className={cn(buttonVariants({ variant: "outline" }), "w-full shrink-0 sm:w-auto")}
        >
          Impact Snapshot
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
            <span className="text-sm text-muted-foreground">Training</span>
            <select
              className={fieldClassName}
              name="training_id"
              defaultValue={parsed.filters.trainingId ?? ""}
            >
              <option value="">All trainings</option>
              {report.trainings.map((training) => (
                <option key={training.id} value={training.id}>
                  {training.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Completion status</span>
            <select
              className={fieldClassName}
              name="status"
              defaultValue={parsed.filters.status ?? ""}
            >
              <option value="">All statuses</option>
              {COMPLETION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {COMPLETION_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Last activity from</span>
            <input
              className={fieldClassName}
              type="date"
              name="from"
              defaultValue={parsed.filters.from ?? ""}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Last activity to</span>
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
            Apply filters
          </Button>
          {hasFilters ? (
            <Link
              href="/manager/reports"
              className={cn(buttonVariants({ variant: "ghost" }), "w-full sm:w-auto")}
            >
              Clear filters
            </Link>
          ) : null}
          <Link
            href={`/api/manager/reports/export?${exportQuery}format=csv`}
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            Download CSV
          </Link>
          <Link
            href={`/api/manager/reports/export?${exportQuery}format=pdf`}
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            Download PDF
          </Link>
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-semibold">Preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.rows.length} of {report.participantCount} participants
            {parsed.filters.trainingId
              ? " · status is for the selected training"
              : " · status is across assigned trainings"}
            .
          </p>
        </div>
        {report.rows.length === 0 ? (
          report.participantCount === 0 ? (
            <EmptyState
              framed={false}
              title="No one has joined yet"
              actionHref="/manager"
              actionLabel="Open dashboard"
            >
              Share your invite code from the Dashboard so fathers can join.
              Reports fill in after someone is in the group.
            </EmptyState>
          ) : (
            <EmptyState
              framed={false}
              title="No matching participants"
              actionHref={hasFilters ? "/manager/reports" : undefined}
              actionLabel={hasFilters ? "Clear filters" : undefined}
            >
              No one matches these filters. Clear them to see the full group.
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
                      <span className="text-muted-foreground">Profile</span>
                      <span>{PROFILE_STATUS_LABEL[row.profileStatus]}</span>
                    </p>
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span>{COMPLETION_STATUS_LABEL[row.completionStatus]}</span>
                    </p>
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Trainings</span>
                      <span className="text-right">
                        {row.assignmentTitles.join(", ") || "None assigned"}
                      </span>
                    </p>
                    {row.certificateSerials ? (
                      <p className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">Serials</span>
                        <span className="text-right font-mono text-xs">
                          {row.certificateSerials}
                        </span>
                      </p>
                    ) : null}
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Last active</span>
                      <span>{formatShortDate(row.lastActivity)}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Profile</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Assignments</th>
                    <th className="px-4 py-3 font-medium">Serials</th>
                    <th className="px-6 py-3 font-medium">Last activity</th>
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
                        {PROFILE_STATUS_LABEL[row.profileStatus]}
                      </td>
                      <td className="px-4 py-3">
                        {COMPLETION_STATUS_LABEL[row.completionStatus]}
                      </td>
                      <td className="px-4 py-3">
                        {row.assignmentTitles.join("; ") || "None assigned"}
                        <p className="text-xs text-muted-foreground">{row.progressDetail}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {row.certificateSerials || "—"}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {formatShortDate(row.lastActivity)}
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
