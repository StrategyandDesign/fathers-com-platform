import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CoverPhoto } from "@/components/brand/cover";
import { SessionAdvanceButton } from "@/components/father/session-advance-button";
import { SessionCrumbNote, SessionHeader } from "@/components/father/session-header";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { sessionCover } from "@/lib/brand/photos";
import { markFilmWatched } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { loadFatherOrgPhotoCovers } from "@/lib/org-photos/data";
import { youtubeEmbedUrl } from "@/lib/father/types";
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
  const context = await loadSessionContext(user.id, sessionId);

  if (!context) {
    notFound();
  }

  if (!context.unlocked) {
    redirect(`/father/sessions/${context.redirectSessionId}`);
  }

  const { t } = await getI18n();
  const { session, training, progress, completedCount, sessionTotal } = context;
  const embed = youtubeEmbedUrl(session.video_url);
  const filmDone = progress?.film_completed ?? false;
  const checkinDone = progress?.checkin_completed ?? false;
  const actionDone = progress?.action_completed ?? false;
  const orgPhotos = embed ? null : await loadFatherOrgPhotoCovers(user.id);
  const nextHref = !checkinDone
    ? `/father/sessions/${session.id}/checkin`
    : !actionDone
      ? `/father/sessions/${session.id}/action`
      : `/father?done=${encodeURIComponent(session.id)}`;
  const nextLabel = !checkinDone
    ? t("father.session.continueCheckin")
    : !actionDone
      ? t("father.session.continueAction")
      : t("father.session.continueHome");

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <SessionHeader
        training={training}
        session={session}
        current="film"
        completedCount={completedCount}
        sessionTotal={sessionTotal}
        backHref="/father"
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
            <CoverPhoto src={sessionCover(session.session_number, orgPhotos?.photoPack)} />
          </div>
        )}
      </div>

      <Flash error={error} />

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
          <SessionAdvanceButton label={t("father.session.iWatched")} />
        </form>
      )}

      <SessionCrumbNote />
    </div>
  );
}
