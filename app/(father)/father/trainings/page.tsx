import Link from "next/link";

import { CoverPhoto } from "@/components/brand/cover";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth/session";
import { loadFatherHome } from "@/lib/father/data";
import { sessionNotePreview } from "@/lib/father/session-questions";
import { continueHref, type SessionProgress } from "@/lib/father/types";

function sessionInProgress(progress: SessionProgress | null) {
  if (!progress) return false;
  return (
    progress.film_completed ||
    progress.checkin_completed ||
    progress.action_completed ||
    progress.status === "in_progress"
  );
}
import { loadFatherOrgPhotoCovers, resolveTrainingCardCover } from "@/lib/org-photos/data";
import { interactiveLinkClassName, sessionDotClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function FatherTrainingsPage() {
  const { user } = await requireRole("father");
  const [{ trainingCards }, orgPhotos] = await Promise.all([
    loadFatherHome(user.id),
    loadFatherOrgPhotoCovers(user.id),
  ]);

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
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
          {trainingCards.map(({ training, completed, total, next, nextProgress, sessionDots, certificate }) => {
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
            const notes = sessionDots.filter((dot) => dot.note?.trim());
            return (
              <article
                key={training.id}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="aspect-video overflow-hidden rounded-t-xl bg-[#101510]">
                  <CoverPhoto
                    src={resolveTrainingCardCover(
                      training.slug,
                      orgPhotos.trainingUrls[training.slug]
                    )}
                  />
                </div>
                <div className="space-y-4 p-4 sm:p-5 lg:p-6">
                  <div className="space-y-2">
                    <h2 className="font-heading text-xl font-semibold tracking-tight">
                      {training.title}
                    </h2>
                    {training.description ? (
                      <p className="text-sm text-muted-foreground">
                        {training.description}
                      </p>
                    ) : total === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sessions will appear when this training is ready.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {completed}/{total} Sessions Complete
                    </p>
                    <ProgressBar value={percent} />
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,2.75rem))] gap-2">
                      {sessionDots.map((dot) => {
                        const className = cn(
                          sessionDotClassName,
                          dot.done
                            ? "bg-primary text-primary-foreground hover:bg-primary/85"
                            : "bg-white/8 text-muted-foreground hover:bg-white/10 hover:text-foreground",
                          !dot.unlocked && "cursor-not-allowed opacity-45 hover:bg-white/8 hover:text-muted-foreground"
                        );
                        if (!dot.unlocked) {
                          return (
                            <span
                              key={dot.id}
                              title={`${dot.title} — finish earlier sessions first`}
                              aria-label={`Session ${dot.number}: ${dot.title} (locked)`}
                              className={className}
                            >
                              {dot.number}
                            </span>
                          );
                        }
                        return (
                          <Link
                            key={dot.id}
                            href={`/father/sessions/${dot.id}`}
                            title={dot.title}
                            aria-label={`Session ${dot.number}: ${dot.title}`}
                            className={className}
                          >
                            {dot.number}
                          </Link>
                        );
                      })}
                    </div>
                    {notes.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <ul className="space-y-1">
                          {notes.map((dot) => (
                            <li key={dot.id}>
                              <Link
                                href={`/father/sessions/${dot.id}/checkin`}
                                className={cn(
                                  "inline-flex min-h-11 items-center text-sm text-muted-foreground",
                                  interactiveLinkClassName
                                )}
                              >
                                Session {dot.number} · {sessionNotePreview(dot.note ?? "")}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {next ? (
                        <Link
                          href={continueHref(next.id, nextProgress)}
                          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
                        >
                          {completed === 0 && !sessionInProgress(nextProgress)
                            ? "Start Session 1"
                            : "Continue training"}
                        </Link>
                      ) : total === 0 ? null : (
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
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
