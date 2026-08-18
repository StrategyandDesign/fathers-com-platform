import {
  stageHeaderPaths,
  TrainingStageSessionShell,
} from "@/components/admin/training-stage-session-shell";
import { SessionContinueLink } from "@/components/father/session-continue-link";
import { SessionFilmPlayer } from "@/components/father/session-film-player";
import { SessionHeader } from "@/components/father/session-header";
import {
  requireAdminStageSession,
  stageCatalogTotal,
  stagePaths,
} from "@/lib/admin/stage";
import { sessionCover } from "@/lib/brand/photos";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminTrainingStageFilmPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const { training, session } = await requireAdminStageSession(id, sessionId);
  const { t } = await getI18n();
  const paths = stagePaths(training.id);
  const header = stageHeaderPaths(training.id, session.id);

  return (
    <TrainingStageSessionShell training={training} session={session} current="film">
      <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
        <SessionHeader
          training={training}
          session={session}
          current="film"
          completedCount={0}
          sessionTotal={stageCatalogTotal(training)}
          backHref={paths.hub}
          {...header}
        />
        <SessionFilmPlayer
          session={session}
          coverSrc={sessionCover(session.session_number, "default")}
        />
        <div className="mx-auto max-w-lg space-y-3 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("father.session.filmNextHint")}
          </p>
          <SessionContinueLink
            href={paths.checkin(session.id)}
            label={t("father.session.continueCheckin")}
          />
        </div>
      </div>
    </TrainingStageSessionShell>
  );
}
