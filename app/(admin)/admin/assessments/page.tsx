import Link from "next/link";

import { DevelopmentStatusBadge } from "@/components/admin/development-status";
import { ReleaseStatusBadge } from "@/components/admin/release-status";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAdminKeystoneRelease } from "@/lib/admin/assessment-data";
import { loadAdminPlatformAssessments } from "@/lib/admin/platform-assessment-data";
import {
  assessmentReleaseState,
  isArchivedAssessment,
} from "@/lib/admin/platform-assessments";
import { asDevelopmentStatus, formatEditedAt } from "@/lib/admin/development";
import { requireRole } from "@/lib/auth/session";
import { PROFILE_QUESTION_COUNT } from "@/lib/father/questions";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; view?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const [keystone, authored] = await Promise.all([
    loadAdminKeystoneRelease(),
    loadAdminPlatformAssessments(),
  ]);
  const archivedView = flash.view === "archived";
  const visible = authored.filter((row) =>
    archivedView ? isArchivedAssessment(row) : !isArchivedAssessment(row)
  );
  const released = Boolean(keystone.releasedAt);
  const pending = keystone.releaseTargets.filter((row) => row.reviewStatus === "pending").length;
  const accepted = keystone.releaseTargets.filter((row) => row.reviewStatus === "accepted").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Assessments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Super-admins create weighted assessments here, Stage them, then
            share with organization Leaders. Leaders decide what their fathers
            can take. Keystone stays the 128-question instrument.
          </p>
        </div>
        <Link href="/admin/assessments/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
          New assessment
        </Link>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/assessments"
          className={cn(
            buttonVariants({ variant: archivedView ? "outline" : "default", size: "sm" })
          )}
        >
          Active
        </Link>
        <Link
          href="/admin/assessments?view=archived"
          className={cn(
            buttonVariants({ variant: archivedView ? "default" : "outline", size: "sm" })
          )}
        >
          Archived
        </Link>
      </div>

      {!archivedView ? (
        <Link
          href="/admin/assessments/keystone"
          className={cn(
            "block rounded-xl border border-border bg-card p-4 sm:p-6",
            interactiveSurfaceClassName
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-semibold">Keystone Assessment</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {PROFILE_QUESTION_COUNT} questions · Platform assessment · The
                instrument itself does not change
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {released
                  ? `${accepted} accepted · ${pending} waiting`
                  : keystone.firstReleasedAt
                    ? "Un-released. Leaders cannot accept it again until you release it."
                    : "Not in Leader review yet. Every organization can already offer it."}
              </p>
            </div>
            <span className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
              Open
            </span>
          </div>
        </Link>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title={archivedView ? "No archived assessments" : "No weighted assessments yet"}
          actionHref={archivedView ? "/admin/assessments" : "/admin/assessments/new"}
          actionLabel={archivedView ? "Back to active" : "New assessment"}
        >
          {archivedView
            ? "Archived assessments stay here until you recover them."
            : "Build a weighted instrument, Stage it, mark Ready, then release it to Leaders."}
        </EmptyState>
      ) : (
        <div className="grid gap-4">
          {visible.map((row) => (
            <Link
              key={row.id}
              href={`/admin/assessments/${row.id}`}
              className={cn(
                "block rounded-xl border border-border bg-card p-4 sm:p-6",
                interactiveSurfaceClassName
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-semibold">{row.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[
                      `${row.questionCount} question${row.questionCount === 1 ? "" : "s"}`,
                      `${row.domainCount} domain${row.domainCount === 1 ? "" : "s"}`,
                      "Weighted",
                      row.working_title,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Edited {formatEditedAt(row.last_edited_at)}
                    {row.lastEditedByName ? ` · ${row.lastEditedByName}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <DevelopmentStatusBadge status={asDevelopmentStatus(row.development_status)} />
                  <ReleaseStatusBadge
                    state={assessmentReleaseState({
                      published: row.published,
                      releasedAt: row.releasedAt,
                      firstReleasedAt: row.firstReleasedAt,
                      developmentStatus: row.development_status,
                    })}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
