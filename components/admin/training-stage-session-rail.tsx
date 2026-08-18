import Link from "next/link";

import {
  nextStageHrefAfterAction,
  stagePaths,
  stageSessionReadiness,
  type StageStep,
} from "@/lib/admin/stage";
import type { AdminTrainingRow } from "@/lib/admin/types";
import type { Session } from "@/lib/father/types";
import { interactiveLinkClassName } from "@/lib/ui";

export function TrainingStageSessionRail({
  training,
  session,
  current,
}: {
  training: AdminTrainingRow;
  session: Session;
  current: StageStep;
}) {
  const paths = stagePaths(training.id);
  const row = stageSessionReadiness(session, training);
  const index = training.sessions.findIndex((item) => item.id === session.id);
  const previous = index > 0 ? training.sessions[index - 1] : null;
  const following = index >= 0 ? training.sessions[index + 1] : null;

  return (
    <aside className="space-y-4 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-24">
      <div>
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          This session
        </p>
        <p className="mt-1 font-medium">{session.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {row.hasVideo
            ? "Playable YouTube film."
            : "No YouTube URL. Participants see the platform still."}
        </p>
      </div>

      <ol className="space-y-1 text-sm">
        <RailStep
          href={paths.session(session.id)}
          label="Film"
          current={current === "film"}
        />
        <RailStep
          href={paths.checkin(session.id)}
          label="Check-in"
          current={current === "checkin"}
        />
        <RailStep
          href={paths.action(session.id)}
          label="Action"
          current={current === "action"}
        />
      </ol>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          <span className="text-foreground/80">Check-in. </span>
          {row.checkinStem}
        </p>
        <p>
          <span className="text-foreground/80">Action. </span>
          {row.actionStem}
        </p>
      </div>

      <div className="space-y-2 border-t border-border pt-4 text-sm">
        {previous ? (
          <p>
            <Link href={paths.session(previous.id)} className={interactiveLinkClassName}>
              Previous session
            </Link>
          </p>
        ) : null}
        {current === "action" ? (
          <p>
            <Link
              href={nextStageHrefAfterAction(training, session)}
              className={interactiveLinkClassName}
            >
              {following ? "Next session" : "Back to snapshot"}
            </Link>
          </p>
        ) : following ? (
          <p>
            <Link href={paths.session(following.id)} className={interactiveLinkClassName}>
              Next session
            </Link>
          </p>
        ) : null}
        <p>
          <Link href={paths.edit} className={interactiveLinkClassName}>
            Edit this training
          </Link>
        </p>
      </div>
    </aside>
  );
}

function RailStep({
  href,
  label,
  current,
}: {
  href: string;
  label: string;
  current: boolean;
}) {
  if (current) {
    return (
      <li className="font-medium text-foreground" aria-current="step">
        {label}
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className={interactiveLinkClassName}>
        {label}
      </Link>
    </li>
  );
}
