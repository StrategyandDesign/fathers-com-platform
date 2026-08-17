import { notFound, redirect } from "next/navigation";

import { CoverPhoto } from "@/components/brand/cover";
import { SessionCrumbNote, SessionHeader } from "@/components/father/session-header";
import { SessionSteps } from "@/components/father/session-steps";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth/session";
import { sessionCover } from "@/lib/brand/photos";
import { markFilmWatched } from "@/lib/father/actions";
import { loadFatherHome, loadSessionContext } from "@/lib/father/data";
import { loadFatherOrgPhotoCovers } from "@/lib/org-photos/data";
import { youtubeEmbedUrl } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { sessionCtaClassName } from "@/lib/ui";

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
  const context = await loadSessionContext(user.id, sessionId);

  if (!context) {
    notFound();
  }

  if (!context.unlocked) {
    redirect(`/father/sessions/${context.redirectSessionId}`);
  }

  const { t } = await getI18n();
  const { session, training, progress } = context;
  const embed = youtubeEmbedUrl(session.video_url);
  const filmDone = progress?.film_completed ?? false;
  const [{ trainingCards }, orgPhotos] = await Promise.all([
    loadFatherHome(user.id),
    loadFatherOrgPhotoCovers(user.id),
  ]);
  const card = trainingCards.find((item) => item.training.id === training.id);
  const completedCount = card?.completed ?? 0;
  const sessionTotal = card?.total ?? training.session_count;
  const percent = sessionTotal ? Math.round((completedCount / sessionTotal) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <SessionHeader
        training={training}
        session={session}
        current="film"
        completedCount={completedCount}
        sessionTotal={sessionTotal}
        backHref="/father/trainings"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-black">
        {embed ? (
          <div className="aspect-video">
            <iframe
              className="h-full w-full"
              src={embed}
              title={session.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="relative aspect-video">
            <CoverPhoto src={sessionCover(session.session_number, orgPhotos.photoPack)} />
          </div>
        )}
      </div>

      <ProgressBar value={percent} className="hidden lg:block" />

      <SessionSteps
        sessionId={session.id}
        current="film"
        filmCompleted={progress?.film_completed ?? false}
        checkinCompleted={progress?.checkin_completed ?? false}
        actionCompleted={progress?.action_completed ?? false}
      />

      <SessionCrumbNote />

      <Flash error={error} />

      <form action={markFilmWatched} className="flex justify-center max-lg:block">
        <input type="hidden" name="session_id" value={session.id} />
        <Button type="submit" variant="inverse" size="lg" className={sessionCtaClassName}>
          {filmDone ? t("father.session.continueCheckin") : t("father.session.iWatched")}
        </Button>
      </form>
    </div>
  );
}
