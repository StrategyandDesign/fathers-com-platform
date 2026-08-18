import {
  stageHeaderPaths,
  TrainingStageSessionShell,
} from "@/components/admin/training-stage-session-shell";
import { SessionCheckinFields } from "@/components/father/session-checkin-fields";
import { SessionContinueLink } from "@/components/father/session-continue-link";
import { SessionHeader } from "@/components/father/session-header";
import { requireAdminStageSession, stagePaths } from "@/lib/admin/stage";
import { checkinQuestionsFor } from "@/lib/father/session-questions";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminTrainingStageCheckinPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const { training, session } = await requireAdminStageSession(id, sessionId);
  const { t } = await getI18n();
  const paths = stagePaths(training.id);
  const header = stageHeaderPaths(training.id, session.id);
  const questions = checkinQuestionsFor(session, training);

  return (
    <TrainingStageSessionShell
      training={training}
      session={session}
      current="checkin"
    >
      <div className="mx-auto max-w-2xl space-y-5 lg:space-y-6">
        <SessionHeader
          training={training}
          session={session}
          current="checkin"
          backHref={paths.session(session.id)}
          {...header}
        />
        <div className="space-y-5 lg:space-y-6">
          <SessionCheckinFields questions={questions} autoAdvance={false} />
          <SessionContinueLink href={paths.action(session.id)} label={t("common.next")} />
        </div>
      </div>
    </TrainingStageSessionShell>
  );
}
