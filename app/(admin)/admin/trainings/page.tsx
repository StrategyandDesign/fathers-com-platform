import Link from "next/link";

import { AdminDeskList, AdminDeskRow } from "@/components/admin/desk-list";
import { DevelopmentStatusBadge } from "@/components/admin/development-status";
import { AdminFilmFlags } from "@/components/admin/film-flags";
import { ReleaseStatusBadge } from "@/components/admin/release-status";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAdminTrainings } from "@/lib/admin/data";
import { asDevelopmentStatus, formatEditedAt, isArchivedTraining } from "@/lib/admin/development";
import { trainingReleaseState } from "@/lib/admin/release";
import { requireRole } from "@/lib/auth/session";
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
            You create and share trainings with organization Leaders. Leaders
            then decide what their fathers receive. Structure sessions, Stage
            the Father path, mark Ready, then Release.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href="/admin/trainings/sources"
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            Bring in a training
          </Link>
          <Link href="/admin/trainings/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
            New training
          </Link>
        </div>
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

      <AdminDeskList
        countHeader="Sessions"
        actionHeader="Stage"
        empty={
          visible.length === 0 ? (
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
          ) : undefined
        }
      >
        {visible.map((training) => (
          <AdminDeskRow
            key={training.id}
            href={`/admin/trainings/${training.id}`}
            title={training.title}
            count={training.sessions.length}
            countLabel="Sessions"
            development={
              <DevelopmentStatusBadge status={asDevelopmentStatus(training.development_status)} />
            }
            release={<ReleaseStatusBadge state={trainingReleaseState(training)} />}
            actionHref={`/admin/trainings/${training.id}/stage`}
            actionLabel="Stage"
          >
            {training.working_title ? (
              <span className="block truncate text-sm text-muted-foreground">
                Working title: {training.working_title}
              </span>
            ) : null}
            {training.attribution ? (
              <span className="block truncate text-sm text-muted-foreground">
                From {training.attribution}
              </span>
            ) : null}
            <span className="block truncate text-sm text-muted-foreground">
              {`${training.sessions.length} session${training.sessions.length === 1 ? "" : "s"}`}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Edited {formatEditedAt(training.last_edited_at)}
            </span>
            <AdminFilmFlags sessions={training.sessions} />
          </AdminDeskRow>
        ))}
      </AdminDeskList>
    </div>
  );
}
