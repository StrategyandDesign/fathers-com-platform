import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SessionAdvanceButton } from "@/components/father/session-advance-button";
import { SessionFilmPlayer } from "@/components/father/session-film-player";
import { SessionHeader } from "@/components/father/session-header";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { sessionCover } from "@/lib/brand/photos";
import { loadActionCommitment } from "@/lib/father/action-commitment-data";
import { markFilmWatched } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { youtubeEmbedUrl } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerOrgPhotoCovers } from "@/lib/org-photos/data";
import { PRACTICE_ROOT, PRACTICE_WALK } from "@/lib/practice/paths";
import { sessionCtaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function LeaderPracticeFilmPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { sessionId } = await params;
  const { error } = await searchParams;
  const { user } = await requireRole("manager");
  const context = await loadSessionContext(user.id, sessionId);

  if (!context) {
    notFound();
  }

  if (!context.unlocked) {
    redirect(PRACTICE_WALK.session(context.redirectSessionId));
  }

  const { t } = await getI18n();
  const { session, training, progress, completedCount, sessionTotal } = context;
  const embed = youtubeEmbedUrl(session.video_url);
  const filmDone = progress?.film_completed ?? false;
  const checkinDone = progress?.checkin_completed ?? false;
  const actionDone = progress?.action_completed ?? false;
  const outcome =
    actionDone ? (await loadActionCommitment(user.id, session.id))?.outcomeNote : null;
  const orgPhotos = embed ? null : await loadManagerOrgPhotoCovers(user.id);
  const nextHref = !checkinDone
    ? PRACTICE_WALK.checkin(session.id)
    : !actionDone
      ? PRACTICE_WALK.action(session.id)
      : PRACTICE_WALK.done(session.id);
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
        backHref={PRACTICE_ROOT}
        trainingHref={PRACTICE_ROOT}
        filmHref={PRACTICE_WALK.session(session.id)}
        checkinHref={PRACTICE_WALK.checkin(session.id)}
        actionHref={PRACTICE_WALK.action(session.id)}
        filmCompleted={filmDone}
        checkinCompleted={checkinDone}
      />

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
