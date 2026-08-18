import { TrainingStageBanner } from "@/components/admin/training-stage-banner";
import { TrainingStageSessionRail } from "@/components/admin/training-stage-session-rail";
import { stagePaths, type StageStep } from "@/lib/admin/stage";
import type { AdminTrainingRow } from "@/lib/admin/types";
import type { Session } from "@/lib/father/types";

export function TrainingStageSessionShell({
  training,
  session,
  current,
  children,
}: {
  training: AdminTrainingRow;
  session: Session;
  current: StageStep;
  children: React.ReactNode;
}) {
  const paths = stagePaths(training.id);

  return (
    <div className="space-y-5">
      <TrainingStageBanner
        trainingTitle={training.title}
        hubHref={paths.hub}
        editHref={paths.edit}
        current={current}
        sessionTitle={session.title}
      />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8">
        <div className="min-w-0">{children}</div>
        <TrainingStageSessionRail
          training={training}
          session={session}
          current={current}
        />
      </div>
    </div>
  );
}

export function stageHeaderPaths(trainingId: string, sessionId: string) {
  const paths = stagePaths(trainingId);
  return {
    filmHref: paths.session(sessionId),
    checkinHref: paths.checkin(sessionId),
    actionHref: paths.action(sessionId),
    trainingHref: paths.hub,
    unlockAll: true as const,
    filmCompleted: true,
    checkinCompleted: true,
  };
}
