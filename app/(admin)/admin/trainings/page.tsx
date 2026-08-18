import Link from "next/link";

import { DevelopmentStatusBadge } from "@/components/admin/development-status";
import { ReleaseStatusBadge } from "@/components/admin/release-status";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { asDevelopmentStatus, formatEditedAt, isArchivedTraining } from "@/lib/admin/development";
import { loadAdminTrainings } from "@/lib/admin/data";
import { trainingReleaseState } from "@/lib/admin/release";
import { requireRole } from "@/lib/auth/session";
import { AdminFilmFlags } from "@/components/admin/film-flags";
import { trainingPartSubtitle } from "@/lib/trainings/series";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminTrainingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; view?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const trainings = await loadAdminTrainings();
  const archivedView = flash.view === "archived";
  const visible = trainings.filter((training) =>
    archivedView ? isArchivedTraining(training) : !isArchivedTraining(training)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Trainings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Development sandbox. Structure sessions, Stage the Father path, then
            mark Ready. Only Released trainings enter Leader review.
          </p>
        </div>
        <Link href="/admin/trainings/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
          New training
        </Link>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/trainings"
          className={cn(
            buttonVariants({ variant: archivedView ? "outline" : "default", size: "sm" })
          )}
        >
          Active
        </Link>
        <Link
          href="/admin/trainings?view=archived"
          className={cn(
            buttonVariants({ variant: archivedView ? "default" : "outline", size: "sm" })
          )}
        >
          Archived
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {visible.length === 0 ? (
          <EmptyState
            framed={false}
            title={archivedView ? "No archived trainings" : "No trainings yet"}
            actionHref={archivedView ? "/admin/trainings" : "/admin/trainings/new"}
            actionLabel={archivedView ? "Back to active" : "New training"}
          >
            {archivedView
              ? "Archive an unfinished idea from its development desk. Recover it anytime."
              : "Create a draft, add sessions, Stage the Father path, then release when ready."}
          </EmptyState>
        ) : (
          <ul>
            <li className="hidden border-b border-border text-xs tracking-wide text-muted-foreground uppercase md:grid md:grid-cols-[minmax(0,1fr)_5.5rem]">
              <div className="grid grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(10rem,1fr)] gap-4 px-6 py-3">
                <span>Title</span>
                <span>Sessions</span>
                <span>Development</span>
              </div>
              <span className="flex items-center justify-end px-4">Stage</span>
            </li>
            {visible.map((training) => (
              <li
                key={training.id}
                className="grid items-stretch border-b border-border last:border-0 md:grid-cols-[minmax(0,1fr)_5.5rem]"
              >
                <Link
                  href={`/admin/trainings/${training.id}`}
                  className={cn(
                    "grid gap-2 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(10rem,1fr)] md:items-center",
                    interactiveSurfaceClassName
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{training.title}</span>
                    {training.working_title ? (
                      <span className="block truncate text-sm text-muted-foreground">
                        Working title: {training.working_title}
                      </span>
                    ) : null}
                    <span className="block truncate text-sm text-muted-foreground">
                      {trainingPartSubtitle(training, training.sessions.length) ??
                        (training.series_title
                          ? training.series_title
                          : `${training.sessions.length} session${
                              training.sessions.length === 1 ? "" : "s"
                            }`)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      Edited {formatEditedAt(training.last_edited_at)}
                    </span>
                    <AdminFilmFlags sessions={training.sessions} />
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Sessions</span>
                    <span className="tabular-nums">{training.sessions.length}</span>
                  </span>
                  <span className="space-y-1 text-sm">
                    <span className="flex items-baseline justify-between gap-3 md:block">
                      <span className="text-muted-foreground md:hidden">Development</span>
                      <DevelopmentStatusBadge
                        status={asDevelopmentStatus(training.development_status)}
                      />
                    </span>
                    <span className="block">
                      <ReleaseStatusBadge state={trainingReleaseState(training)} />
                    </span>
                  </span>
                </Link>
                <div className="flex items-center px-4 pb-4 sm:px-6 md:justify-end md:px-4 md:py-0">
                  <Link
                    href={`/admin/trainings/${training.id}/stage`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full md:w-auto")}
                  >
                    Stage
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
