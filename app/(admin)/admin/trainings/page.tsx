import Link from "next/link";

import { ReleaseStatusBadge } from "@/components/admin/release-status";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAdminTrainings } from "@/lib/admin/data";
import { trainingReleaseState } from "@/lib/admin/release";
import { requireRole } from "@/lib/auth/session";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminTrainingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const trainings = await loadAdminTrainings();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Trainings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform catalog. Publish when sessions are ready, then release to
            selected organizations or all.
          </p>
        </div>
        <Link href="/admin/trainings/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
          New training
        </Link>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {trainings.length === 0 ? (
          <EmptyState
            framed={false}
            title="No trainings yet"
            actionHref="/admin/trainings/new"
            actionLabel="New training"
          >
            Add one, add sessions, publish, then release it to managers.
          </EmptyState>
        ) : (
          <ul>
            <li className="hidden grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(8rem,0.9fr)] gap-4 border-b border-border px-6 py-3 text-xs tracking-wide text-muted-foreground uppercase md:grid">
              <span>Title</span>
              <span>Sessions</span>
              <span>Status</span>
            </li>
            {trainings.map((training) => (
              <li key={training.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/trainings/${training.id}`}
                  className={cn(
                    "grid gap-2 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(8rem,0.9fr)] md:items-center",
                    interactiveSurfaceClassName
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{training.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {training.slug}
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Sessions</span>
                    <span className="tabular-nums">{training.sessions.length}</span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Status</span>
                    <ReleaseStatusBadge state={trainingReleaseState(training)} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
