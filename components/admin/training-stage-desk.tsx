import Link from "next/link";

import { markTrainingPreviewed } from "@/lib/admin/actions";
import { asDevelopmentStatus, formatEditedAt, trainingDevelopmentChecklist } from "@/lib/admin/development";
import { DevelopmentStatusBadge } from "@/components/admin/development-status";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  isVideoTraining,
  stagePaths,
  stageSessionReadiness,
  trainingVideoReadiness,
  type StageSessionReadiness,
} from "@/lib/admin/stage";
import { hasHardcodedSkillPack } from "@/lib/father/session-questions";
import { hasTrainingOverview } from "@/lib/father/training-door";
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
  const hasOverview = hasTrainingOverview(training);
  const walkHref = hasOverview
    ? paths.overview
    : training.sessions[0]
      ? paths.session(training.sessions[0].id)
      : paths.edit;
  const checklist = trainingDevelopmentChecklist(training, {
    sessionHasHardcoded: (session) => hasHardcodedSkillPack(session, training),
  });

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">Sourcing desk</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {videoTraining
              ? "Sandbox walk. Same overview film, Home card, session Film, Check-in, and Action a Father gets after Leader assignment. Nothing is written."
              : "Add YouTube URLs to stage the films. Check-in and Action already use the same prompts he will get."}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <DevelopmentStatusBadge status={asDevelopmentStatus(training.development_status)} />
          {training.sessions.length > 0 ? (
            <Link href={walkHref} className={cn(buttonVariants(), "w-full sm:w-auto")}>
              Walk as Father
            </Link>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
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
        <DeskStat
          label="Overview film"
          value={hasOverview ? "Posted" : "Not yet"}
        />
      </dl>

      <div className="rounded-lg border border-border bg-black/20 px-3 py-3">
        <p className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          Previewed
        </p>
        <p className="mt-1 text-sm font-medium">
          {training.previewed_at ? formatEditedAt(training.previewed_at) : "Not yet"}
        </p>
        {training.sessions.length > 0 ? (
          <form action={markTrainingPreviewed} className="mt-3">
            <input type="hidden" name="training_id" value={training.id} />
            <Button type="submit" variant="outline" size="sm">
              Mark Stage walk complete
            </Button>
          </form>
        ) : null}
        {!checklist.items.find((item) => item.key === "previewed")?.done ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Finish the last Action, or mark the walk complete, before Ready.
          </p>
        ) : null}
      </div>

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
