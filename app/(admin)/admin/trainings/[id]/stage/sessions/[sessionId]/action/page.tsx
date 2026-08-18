import Link from "next/link";

import {
  stageHeaderPaths,
  TrainingStageSessionShell,
} from "@/components/admin/training-stage-session-shell";
import { SessionActionFields } from "@/components/father/session-action-fields";
import { SessionContinueLink } from "@/components/father/session-continue-link";
import { SessionHeader } from "@/components/father/session-header";
import {
  nextStageHrefAfterAction,
  requireAdminStageSession,
  stagePaths,
} from "@/lib/admin/stage";
import { sessionAction } from "@/lib/father/session-questions";
import { getI18n } from "@/lib/i18n/server";
import { interactiveUnderlineClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminTrainingStageActionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const { training, session } = await requireAdminStageSession(id, sessionId);
  const { t } = await getI18n();
  const paths = stagePaths(training.id);
  const header = stageHeaderPaths(training.id, session.id);
  const prompt = sessionAction(session, training);
  const nextHref = nextStageHrefAfterAction(training, session);
  const following = training.sessions.findIndex((row) => row.id === session.id);
  const hasNext = following >= 0 && Boolean(training.sessions[following + 1]);

  return (
    <TrainingStageSessionShell training={training} session={session} current="action">
      <div className="mx-auto max-w-xl space-y-5 lg:space-y-8">
        <SessionHeader
          training={training}
          session={session}
          current="action"
          backHref={paths.checkin(session.id)}
          {...header}
        />
        <div className="space-y-5">
          <SessionActionFields prompt={prompt} t={t} />
          <SessionContinueLink
            href={nextHref}
            label={hasNext ? t("common.continue") : t("father.session.completeAction")}
          />
        </div>
        <p className="text-center">
          <Link
            href={paths.hub}
            className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}
          >
            {t("father.session.doLater")}
          </Link>
        </p>
      </div>
    </TrainingStageSessionShell>
  );
}
