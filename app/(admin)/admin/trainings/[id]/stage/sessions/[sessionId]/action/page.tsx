import Link from "next/link";

import {
  stageHeaderPaths,
  TrainingStageSessionShell,
} from "@/components/admin/training-stage-session-shell";
import { ActionDisplay } from "@/components/father/action-display";
import { ActionIntentionChipPreview } from "@/components/father/action-skill-card";
import { SessionHeader } from "@/components/father/session-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { markTrainingPreviewed } from "@/lib/admin/actions";
import {
  nextStageHrefAfterAction,
  requireAdminStageSession,
  stagePaths,
} from "@/lib/admin/stage";
import { actionSessionEyebrow, actionSkillText } from "@/lib/father/action-commitment";
import { parseSkillPrompt, sessionAction } from "@/lib/father/session-questions";
import { getI18n } from "@/lib/i18n/server";
import { homePrimaryCtaClassName, interactiveUnderlineClassName } from "@/lib/ui";
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
  const skill = actionSkillText(session, parseSkillPrompt(sessionAction(session, training)).stem);
  const nextHref = nextStageHrefAfterAction(training, session);
  const following = training.sessions.findIndex((row) => row.id === session.id);
  const hasNext = following >= 0 && Boolean(training.sessions[following + 1]);

  return (
    <TrainingStageSessionShell training={training} session={session} current="action">
      <div className="mx-auto max-w-lg space-y-8 lg:space-y-10">
        <SessionHeader
          training={training}
          session={session}
          current="action"
          backHref={paths.checkin(session.id)}
          {...header}
        />
        <ActionDisplay
          eyebrow={actionSessionEyebrow(session, skill)}
          skill={skill}
          footer={
            <Link
              href={paths.hub}
              className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}
            >
              {t("father.session.skipForNow")}
            </Link>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("father.session.whenWillYou")}</p>
            <ActionIntentionChipPreview t={t} />
          </div>
          {hasNext ? (
            <Link
              href={nextHref}
              className={cn(buttonVariants({ variant: "default", size: "lg" }), homePrimaryCtaClassName)}
            >
              {t("common.continue")}
            </Link>
          ) : (
            <form action={markTrainingPreviewed}>
              <input type="hidden" name="training_id" value={training.id} />
              <input type="hidden" name="session_id" value={session.id} />
              <Button
                type="submit"
                size="lg"
                className={homePrimaryCtaClassName}
              >
                {t("father.session.finishSession")}
              </Button>
            </form>
          )}
        </ActionDisplay>
      </div>
    </TrainingStageSessionShell>
  );
}
