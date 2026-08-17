import Link from "next/link";

import { CoverPhoto } from "@/components/brand/cover";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth/session";
import { trainingCover } from "@/lib/brand/photos";
import { loadFatherHome } from "@/lib/father/data";
import { cn } from "@/lib/utils";

export default async function FatherTrainingsPage() {
  const { user } = await requireRole("father");
  const { trainingCards } = await loadFatherHome(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Trainings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Move through the catalog in order. A session is done when Film, Check-in,
          and Action are done.
        </p>
      </div>

      {trainingCards.length === 0 ? (
        <EmptyState
          title="No training assigned"
          actionHref="/father"
          actionLabel="Back to Home"
        >
          Your manager hasn’t assigned a training yet. It will show up here when
          they do.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {trainingCards.map(({ training, completed, total, next, sessionDots, certificate }) => {
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
            return (
              <article
                key={training.id}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="h-24 overflow-hidden bg-[#101510] sm:h-36">
                  <CoverPhoto src={trainingCover(training.slug)} />
                </div>
                <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:p-6">
                  <div className="space-y-3">
                    <h2 className="font-heading text-xl font-semibold tracking-tight">
                      {training.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {total} session{total === 1 ? "" : "s"}
                    </p>
                    {training.description ? (
                      <p className="max-w-xl text-sm text-muted-foreground">
                        {training.description}
                      </p>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {next ? (
                        <Link
                          href={`/father/sessions/${next.id}`}
                          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
                        >
                          View Sessions
                        </Link>
                      ) : (
                        <p className="inline-flex min-h-11 items-center text-sm text-primary">
                          Complete
                        </p>
                      )}
                      {certificate ? (
                        <a
                          href={`/api/certificates/${certificate.id}/download`}
                          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
                        >
                          Download certificate
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="shrink-0 tabular-nums">
                        {completed}/{total} Sessions Complete
                      </span>
                    </div>
                    <ProgressBar value={percent} />
                    <div>
                      <p className="mb-2 text-sm text-muted-foreground">Sessions</p>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,2.75rem))] gap-2">
                        {sessionDots.map((dot) => (
                          <Link
                            key={dot.id}
                            href={`/father/sessions/${dot.id}`}
                            title={dot.title}
                            aria-label={`Session ${dot.number}: ${dot.title}`}
                            className={cn(
                              "flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-medium outline-none transition-colors duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px active:opacity-90",
                              dot.done
                                ? "bg-primary text-primary-foreground hover:bg-primary/85"
                                : "bg-white/8 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                            )}
                          >
                            {dot.number}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
