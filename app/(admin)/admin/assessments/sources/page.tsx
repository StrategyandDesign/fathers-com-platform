import Link from "next/link";

import { IntakeStatusBadge, RightsStatusBadge } from "@/components/admin/sourcing-status";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAssessmentIntakes, loadAssessmentSources } from "@/lib/admin/assessment-sourcing-data";
import { requireRole } from "@/lib/auth/session";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminAssessmentSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const [sources, intakes] = await Promise.all([loadAssessmentSources(), loadAssessmentIntakes()]);
  const openCount = intakes.filter((intake) => intake.status === "open" || intake.status === "drafting")
    .length;

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/assessments" className={interactiveLinkClassName}>
          Assessments
        </Link>
        <span className="text-white/20">|</span>
        <span>Bring in</span>
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Bring in an assessment
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record the researcher, the rights to use their instrument, the
            questions, and the scoring key that turns answers into an outcome.
            That compiles to a sandbox draft on the Assessments list.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The scoring key is declarative: dimensions, reverse-keyed items,
            and either the highest dimension or score bands. We do not run
            outside code.
          </p>
        </div>
        <Link
          href="/admin/assessments/sources/new"
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
          <h2 className="font-heading text-lg font-semibold">Researchers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            People or labs you have recorded. Open one to add another instrument.
          </p>
        </div>
        {sources.length === 0 ? (
          <EmptyState
            framed={false}
            title="No researchers yet"
            actionHref="/admin/assessments/sources/new"
            actionLabel="New intake"
          >
            Start with the researcher, then the questions and scoring key they sent.
          </EmptyState>
        ) : (
          <ul>
            {sources.map((source) => {
              const theirs = intakes.filter((intake) => intake.sourceId === source.id);
              return (
                <li key={source.id} className="border-b border-border last:border-0">
                  <Link
                    href={`/admin/assessments/sources/${source.id}`}
                    className={cn("block px-4 py-4 sm:px-6", interactiveSurfaceClassName)}
                  >
                    <span className="block font-medium">{source.name}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {theirs.length === 1 ? "1 instrument" : `${theirs.length} instruments`}
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
            Each row is one instrument being prepared for the catalog.
          </p>
        </div>
        {intakes.length === 0 ? (
          <EmptyState framed={false} title="No intakes yet">
            Record a researcher and a title to begin.
          </EmptyState>
        ) : (
          <ul>
            {intakes.map((intake) => (
              <li key={intake.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/assessments/intakes/${intake.id}`}
                  className={cn(
                    "grid gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6",
                    interactiveSurfaceClassName
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{intake.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {intake.sourceName}
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
