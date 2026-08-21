import Link from "next/link";

import { IntakeStatusBadge, RightsStatusBadge } from "@/components/admin/sourcing-status";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadTrainingIntakes, loadTrainingSources } from "@/lib/admin/sourcing-data";
import { requireRole } from "@/lib/auth/session";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminTrainingSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const [sources, intakes] = await Promise.all([loadTrainingSources(), loadTrainingIntakes()]);
  const openCount = intakes.filter((intake) => intake.status === "open" || intake.status === "drafting").length;

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/trainings" className={interactiveLinkClassName}>
          Trainings
        </Link>
        <span className="text-foreground/20">|</span>
        <span>Bring in</span>
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Bring in a training
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record someone outside Fathers.com, the rights to use their work,
            and a session outline. That opens a normal sandbox draft. Stage,
            mark Ready, publish, then release. Leaders still include or remove
            it for their group.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            This does not pull films from the open web. They send a YouTube
            link. You write Check-in and Action here.
          </p>
        </div>
        <Link
          href="/admin/trainings/sources/new"
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          New intake
        </Link>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <p className="text-sm text-muted-foreground">
        {openCount === 0
          ? "No open intakes."
          : openCount === 1
            ? "1 intake is still being prepared."
            : `${openCount} intakes are still being prepared.`}
      </p>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-semibold">Sources</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            People or groups you have recorded. Open one to add another training.
          </p>
        </div>
        {sources.length === 0 ? (
          <EmptyState
            framed={false}
            title="No sources yet"
            actionHref="/admin/trainings/sources/new"
            actionLabel="New intake"
          >
            Start with the person or group, then the training they are offering.
          </EmptyState>
        ) : (
          <ul>
            {sources.map((source) => {
              const theirs = intakes.filter((intake) => intake.sourceId === source.id);
              return (
                <li key={source.id} className="border-b border-border last:border-0">
                  <Link
                    href={`/admin/trainings/sources/${source.id}`}
                    className={cn("block px-4 py-4 sm:px-6", interactiveSurfaceClassName)}
                  >
                    <span className="block font-medium">{source.name}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {theirs.length === 1
                        ? "1 training"
                        : `${theirs.length} trainings`}
                      {source.contactEmail ? ` · ${source.contactEmail}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-semibold">Intakes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each row is one training being prepared for the catalog.
          </p>
        </div>
        {intakes.length === 0 ? (
          <EmptyState framed={false} title="No intakes yet">
            Record a source and a training title to begin.
          </EmptyState>
        ) : (
          <ul>
            {intakes.map((intake) => (
              <li key={intake.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/trainings/intakes/${intake.id}`}
                  className={cn(
                    "grid gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6",
                    interactiveSurfaceClassName
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{intake.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {intake.sourceName}
                      {intake.trainingTitle ? ` · Draft: ${intake.trainingTitle}` : ""}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-x-3 text-sm">
                    <RightsStatusBadge status={intake.rightsStatus} />
                    <IntakeStatusBadge status={intake.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
