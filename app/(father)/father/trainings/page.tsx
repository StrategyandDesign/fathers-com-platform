import Link from "next/link";

import { CoverPhoto } from "@/components/brand/cover";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth/session";
import { loadFatherHome } from "@/lib/father/data";
import { getI18n } from "@/lib/i18n/server";
import { continueHref, type SessionProgress } from "@/lib/father/types";
import { loadFatherOrgPhotoCovers, resolveTrainingCardCover } from "@/lib/org-photos/data";
import { sessionDotClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function sessionInProgress(progress: SessionProgress | null) {
  if (!progress) return false;
  return (
    progress.film_completed ||
    progress.checkin_completed ||
    progress.action_completed ||
    progress.status === "in_progress"
  );
}

export default async function FatherTrainingsPage() {
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const [{ trainingCards }, orgPhotos] = await Promise.all([
    loadFatherHome(user.id),
    loadFatherOrgPhotoCovers(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("father.trainings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("father.trainings.lead")}
        </p>
      </div>

      {trainingCards.length === 0 ? (
        <EmptyState
          title={t("father.trainings.emptyTitle")}
          actionHref="/father"
          actionLabel={t("father.trainings.backHome")}
        >
          {t("father.trainings.emptyBody")}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
          {trainingCards.map(({ training, completed, total, next, nextProgress, sessionDots, certificate }) => {
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
            return (
              <article
                key={training.id}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="aspect-video overflow-hidden rounded-t-xl bg-[#101510]">
                  <CoverPhoto
                    src={resolveTrainingCardCover(
                      training.slug,
                      orgPhotos.trainingUrls[training.slug],
                      orgPhotos.photoPack
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
                        {t("father.home.sessionsReady")}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {t("father.trainings.sessionsComplete", { completed, total })}
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
                          !dot.unlocked && "pointer-events-none cursor-not-allowed opacity-45 hover:bg-white/8 hover:text-muted-foreground"
                        );
                        if (!dot.unlocked) {
                          return (
                            <span
                              key={dot.id}
                              title={t("father.trainings.lockedTitle", { title: dot.title })}
                              aria-label={t("father.trainings.sessionLocked", {
                                n: dot.number,
                                title: dot.title,
                              })}
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
                            aria-label={t("father.trainings.sessionLabel", {
                              n: dot.number,
                              title: dot.title,
                            })}
                            className={className}
                          >
                            {dot.number}
                          </Link>
                        );
                      })}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {next ? (
                        <Link
                          href={continueHref(next.id, nextProgress)}
                          className={cn(buttonVariants({ size: "lg" }), "w-full min-h-12 sm:w-auto")}
                        >
                          {completed === 0 && !sessionInProgress(nextProgress)
                            ? t("father.trainings.startSession1")
                            : t("father.trainings.continueTraining")}
                        </Link>
                      ) : null}
                      {certificate ? (
                        <a
                          href={`/api/certificates/${certificate.id}/download`}
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "w-full min-h-11 sm:w-auto"
                          )}
                        >
                          {t("father.trainings.downloadCertificate")}
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
