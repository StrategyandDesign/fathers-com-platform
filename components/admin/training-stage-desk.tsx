import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  isVideoTraining,
  stagePaths,
  stageSessionReadiness,
  trainingVideoReadiness,
  type StageSessionReadiness,
} from "@/lib/admin/stage";
import type { AdminTrainingRow } from "@/lib/admin/types";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function TrainingStageDesk({ training }: { training: AdminTrainingRow }) {
  const paths = stagePaths(training.id);
  const video = trainingVideoReadiness(training.sessions);
  const videoTraining = isVideoTraining(training.sessions);
  const rows = training.sessions.map((session) =>
    stageSessionReadiness(session, training)
  );
  const firstMissing = rows.find((row) => !row.hasVideo);
  const walkHref = training.sessions[0]
    ? paths.session(training.sessions[0].id)
    : paths.edit;

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">Sourcing desk</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {videoTraining
              ? "Video training. Walk the participant path, then fix anything the snapshot shows."
              : "Add YouTube URLs to stage the films. Check-in and Action already use the same prompts he will get."}
          </p>
        </div>
        {training.sessions.length > 0 ? (
          <Link href={walkHref} className={cn(buttonVariants(), "w-full sm:w-auto")}>
            Walk as participant
          </Link>
        ) : null}
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <DeskStat
          label="Published"
          value={training.published ? "Yes" : "Not yet"}
        />
        <DeskStat
          label="Sessions"
          value={String(training.sessions.length)}
        />
        <DeskStat
          label="Playable films"
          value={
            video.total === 0
              ? "—"
              : `${video.withVideo} of ${video.total}`
          }
        />
      </dl>

      {firstMissing ? (
        <p className="text-sm text-muted-foreground">
          Session {firstMissing.session.session_number} still uses a still
          cover. Add a YouTube URL on{" "}
          <Link href={paths.edit} className={interactiveLinkClassName}>
            Edit training
          </Link>{" "}
          to preview the film here.
        </p>
      ) : null}

      {training.sessions.length === 0 ? (
        <EmptyState
          framed={false}
          className="px-0 py-0"
          title="No sessions yet"
          actionHref={paths.edit}
          actionLabel="Add a session"
        >
          Staging needs at least one session before you can walk Film →
          Check-in → Action.
        </EmptyState>
      ) : (
        <ol className="space-y-3">
          {rows.map((row) => (
            <StageSessionRow key={row.session.id} row={row} paths={paths} />
          ))}
        </ol>
      )}
    </section>
  );
}

function DeskStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-black/30 px-3 py-3">
      <dt className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

function StageSessionRow({
  row,
  paths,
}: {
  row: StageSessionReadiness;
  paths: ReturnType<typeof stagePaths>;
}) {
  const { session } = row;
  return (
    <li className="rounded-lg border border-border bg-black/20 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            Session {session.session_number}
          </p>
          <p className="font-medium">{session.title}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <ReadyChip ready={row.hasVideo} readyLabel="Film ready" waitLabel="Still cover" />
            <ReadyChip ready={row.hasKeyline} readyLabel="Keyline" waitLabel="No keyline" />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <Link href={paths.session(session.id)} className={interactiveLinkClassName}>
            Film
          </Link>
          <Link href={paths.checkin(session.id)} className={interactiveLinkClassName}>
            Check-in
          </Link>
          <Link href={paths.action(session.id)} className={interactiveLinkClassName}>
            Action
          </Link>
        </div>
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        <p>
          <span className="text-foreground/80">Check-in. </span>
          {row.checkinStem}
        </p>
        <p>
          <span className="text-foreground/80">Action. </span>
          {row.actionStem}
        </p>
      </div>
    </li>
  );
}

function ReadyChip({
  ready,
  readyLabel,
  waitLabel,
}: {
  ready: boolean;
  readyLabel: string;
  waitLabel: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5",
        ready
          ? "border-primary/40 text-foreground"
          : "border-border text-muted-foreground"
      )}
    >
      {ready ? readyLabel : waitLabel}
    </span>
  );
}
