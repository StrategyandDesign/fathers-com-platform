import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAdminTrainings } from "@/lib/admin/data";
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
            Platform catalog. Unpublished trainings stay off new assignment lists.
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
            Add one, then add sessions before you publish it for assignment.
          </EmptyState>
        ) : (
          <ul>
            <li className="hidden grid-cols-[minmax(0,1.6fr)_6rem_7rem] gap-4 border-b border-border px-6 py-3 text-xs tracking-wide text-muted-foreground uppercase md:grid">
              <span>Title</span>
              <span>Sessions</span>
              <span>Status</span>
            </li>
            {trainings.map((training) => (
              <li key={training.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/trainings/${training.id}`}
                  className={cn(
                    "grid gap-2 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1.6fr)_6rem_7rem] md:items-center",
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
                    <span className={training.published ? "text-primary" : "text-muted-foreground"}>
                      {training.published ? "Published" : "Unpublished"}
                    </span>
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
