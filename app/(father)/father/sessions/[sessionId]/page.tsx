import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SessionAdvanceButton } from "@/components/father/session-advance-button";
import { SessionFilmPlayer } from "@/components/father/session-film-player";
import { SessionHeader } from "@/components/father/session-header";
import { TrainingHandoutLinks } from "@/components/father/training-handout-links";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { sessionCover } from "@/lib/brand/photos";
import { loadActionCommitment } from "@/lib/father/action-commitment-data";
import { markFilmWatched } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { loadOnboardingState } from "@/lib/father/onboarding-data";
import { isOnboardingActive } from "@/lib/father/onboarding";
import { loadFatherOrgPhotoCovers } from "@/lib/org-photos/data";
import { loadTrainingHandouts } from "@/lib/training-handouts/data";
import { isSessionComplete, youtubeEmbedUrl } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { sessionCtaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function SessionViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { sessionId } = await params;
  const { error } = await searchParams;
  const { user } = await requireRole("father");
  const [context, onboarding] = await Promise.all([
    loadSessionContext(user.id, sessionId),
    loadOnboardingState(user.id),
  ]);

  if (!context) {
    notFound();
  }

  if (!context.unlocked) {
    redirect(context.gateRedirect ?? `/father/sessions/${context.redirectSessionId}`);
  }

  const { t } = await getI18n();
  const { session, training, progress, completedCount, sessionTotal } = context;
  const handouts = await loadTrainingHandouts(training.id);
  const funnel = isOnboardingActive(onboarding.mode, onboarding.step);
  const embed = youtubeEmbedUrl(session.video_url);
  const filmDone = progress?.film_completed ?? false;
  const checkinDone = progress?.checkin_completed ?? false;
  const actionDone = progress?.action_completed ?? false;
  const outcome =
    actionDone ? (await loadActionCommitment(user.id, session.id))?.outcomeNote : null;
  const orgPhotos = embed ? null : await loadFatherOrgPhotoCovers(user.id);
  const nextHref = !checkinDone
    ? `/father/sessions/${session.id}/checkin`
    : !actionDone
      ? `/father/sessions/${session.id}/action`
      : `/father/sessions/${session.id}/done`;
  const nextLabel = !checkinDone
    ? t("father.session.continueCheckin")
    : !actionDone
      ? t("father.session.continueAction")
      : t("father.session.closeoutContinue");

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <SessionHeader
        training={training}
        session={session}
        current="film"
        completedCount={completedCount}
        sessionTotal={sessionTotal}
        backHref={funnel ? "/father/start" : "/father"}
        trainingHref={funnel ? null : undefined}
        filmCompleted={filmDone}
        checkinCompleted={checkinDone}
      />

      {isSessionComplete(progress) ? (
        <p className="text-sm text-muted-foreground">{t("father.trainings.watchAgainHint")}</p>
      ) : null}

      <TrainingHandoutLinks handouts={handouts} t={t} />

      <SessionFilmPlayer
        session={session}
        coverSrc={sessionCover(session.session_number, orgPhotos?.photoPack)}
        resumeSeconds={progress?.film_seconds ?? 0}
        persistSessionId={session.id}
      />

      <Flash error={error} />

      <div className="mx-auto max-w-lg space-y-3 text-center">
        {outcome ? (
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-start">
            <p className="text-sm font-medium">{t("father.session.whatHappened")}</p>
            <p className="mt-1 text-sm leading-relaxed">{outcome}</p>
          </div>
        ) : null}
        {!checkinDone ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("father.session.filmNextHint")}
          </p>
        ) : !actionDone ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("father.session.actionNextHint")}
          </p>
        ) : null}
        {filmDone ? (
          <div className="flex justify-center max-lg:block">
            <Link
              href={nextHref}
              className={cn(buttonVariants({ variant: "inverse", size: "lg" }), sessionCtaClassName)}
            >
              {nextLabel}
            </Link>
          </div>
        ) : (
          <form action={markFilmWatched}>
            <input type="hidden" name="session_id" value={session.id} />
            <SessionAdvanceButton label={t("father.session.continueCheckin")} />
          </form>
        )}
      </div>
    </div>
  );
}
