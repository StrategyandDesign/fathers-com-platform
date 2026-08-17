import Link from "next/link";
import { notFound } from "next/navigation";

import { CertificateDownloadLink } from "@/components/certificates/download-link";
import { Flash } from "@/components/manager/flash";
import { NudgeForm } from "@/components/manager/nudge-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { loadParticipantCustomAssignments } from "@/lib/assessments/data";
import { ASSIGNMENT_STATUS_LABEL } from "@/lib/assessments/types";
import { requireRole } from "@/lib/auth/session";
import {
  assignTraining,
  markTrainingComplete,
  previewCertificate,
} from "@/lib/manager/actions";
import { loadManagedParticipant } from "@/lib/manager/data";
import { isTrainingAssignable, reviewForGroup } from "@/lib/manager/reviews";
import { clearParticipantNote, saveParticipantNote } from "@/lib/manager/note-actions";
import { NOTE_MAX_LENGTH, loadParticipantNote } from "@/lib/manager/notes";
import {
  NUDGE_STATUS_LABEL,
  NUDGE_TEMPLATE_COPY,
  cooldownRemaining,
  isNudgeTemplate,
  loadNudgeHistory,
  loadReminderPrefAllowed,
  needsNudge,
  quietLabel,
} from "@/lib/manager/nudges";
import { formatShortDate } from "@/lib/manager/types";
import { UserAvatar } from "@/components/layout/user-avatar";
import {
  fieldClassName,
  interactiveLinkClassName,
  interactiveSurfaceClassName,
  textareaClassName,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        className={cn(
          "size-2 rounded-full",
          done ? "bg-primary" : "bg-white/20"
        )}
      />
      <span className={done ? "text-foreground" : "text-muted-foreground"}>
        {done ? "Completed" : "Pending"} {label}
      </span>
    </span>
  );
}

export default async function ManagerParticipantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const detail = await loadManagedParticipant(user.id, id);

  if (!detail) {
    notFound();
  }

  const { participant, progress, reviews } = detail;
  const [customAssignments, historyByFather, remindersAllowed, note] = await Promise.all([
    loadParticipantCustomAssignments(user.id, id),
    loadNudgeHistory([id]),
    loadReminderPrefAllowed(id),
    loadParticipantNote(id),
  ]);
  const nudgeHistory = historyByFather.byFather.get(id) ?? [];
  const historyUnavailable = historyByFather.unavailable;
  const quiet = needsNudge(participant.lastActivity, progress);
  const cooldown = cooldownRemaining(nudgeHistory);
  const assignable = progress.filter((card) =>
    isTrainingAssignable(
      card.training,
      reviewForGroup(reviews, participant.groupId, card.training.id)?.status
    )
  );
  const unassigned = assignable.filter((card) => !card.assigned);
  const withoutCert = progress.filter(
    (card) =>
      !card.certificate && card.total > 0 && card.completed === card.total
  );
  const current =
    progress.find((card) => card.assigned && card.current)?.current ??
    progress.find((card) => card.current)?.current ??
    null;

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager/participants" className={interactiveLinkClassName}>
          Participants
        </Link>
        <span className="text-white/20">|</span>
        <span className="min-w-0">{participant.name}</span>
      </p>
      <Flash error={flash.error} notice={flash.notice} />

      <section className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 sm:items-center sm:gap-5 sm:p-6">
        <UserAvatar
          name={participant.name}
          src={participant.avatarUrl}
          className="size-14 shrink-0 text-lg font-semibold sm:size-16"
        />
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {participant.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {participant.groupName} · Joined {formatShortDate(participant.joinedAt)}
            {quiet ? ` · ${quietLabel(participant.lastActivity)}` : ""}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Private note</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only managers of {participant.groupName} can see this. He never will.
        </p>
        <form action={saveParticipantNote} className="mt-5 space-y-4">
          <input type="hidden" name="father_id" value={participant.fatherId} />
          <label className="block space-y-2">
            <span className="sr-only">Private note</span>
            <textarea
              className={textareaClassName}
              name="body"
              maxLength={NOTE_MAX_LENGTH}
              rows={4}
              defaultValue={note?.body ?? ""}
              placeholder="Spoke with him Tuesday."
              aria-invalid={Boolean(flash.error) || undefined}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {note
                ? `Updated ${formatShortDate(note.updatedAt)}`
                : "Not saved yet."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" className="w-full sm:w-auto">
                Save note
              </Button>
              {note ? (
                <Button
                  formAction={clearParticipantNote}
                  type="submit"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      </section>

      <section
        id="nudge"
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <h2 className="font-heading text-lg font-semibold">Send a nudge</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {quiet
            ? `${quietLabel(participant.lastActivity)}. A short, respectful note — only if he left session reminders on.`
            : "He’s been active recently. You can still send a calm note if you need to."}
        </p>
        {historyUnavailable ? (
          <p className="mt-4 rounded-xl border border-border bg-black/30 px-4 py-3 text-sm text-muted-foreground">
            Couldn’t check recent reminders. Try again in a moment.
          </p>
        ) : remindersAllowed === false ? (
          <p className="mt-4 rounded-xl border border-border bg-black/30 px-4 py-3 text-sm text-muted-foreground">
            He turned off session reminders. A nudge will not be emailed.
          </p>
        ) : cooldown > 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {cooldown === 1
              ? "A reminder already went out. You can send another tomorrow."
              : `A reminder already went out. You can send another in ${cooldown} days.`}
          </p>
        ) : (
          <div className="mt-5">
            <NudgeForm fatherId={participant.fatherId} />
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {Object.values(NUDGE_TEMPLATE_COPY).map((template) => (
                <li key={template.key}>
                  <span className="font-medium text-foreground">{template.label}.</span>{" "}
                  {template.preview}
                </li>
              ))}
            </ul>
          </div>
        )}
        {nudgeHistory.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-medium">Nudge history</h3>
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {nudgeHistory.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm">
                    {isNudgeTemplate(row.template_key)
                      ? NUDGE_TEMPLATE_COPY[row.template_key].label
                      : row.template_key}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {NUDGE_STATUS_LABEL[row.status]} · {formatShortDate(row.sent_at)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">No nudges sent yet.</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Father Profile</h2>
        {participant.profile ? (
          <p className="mt-3 text-muted-foreground">
            Completed {formatShortDate(participant.profile.taken_at)}
            {participant.profile.primary_edge
              ? ` · Primary Edge: ${participant.profile.primary_edge}`
              : ""}
            {participant.profile.primary_determination
              ? ` · Determination: ${participant.profile.primary_determination}`
              : ""}
          </p>
        ) : (
          <p className="mt-3 text-muted-foreground">
            {participant.profileStatus === "in_progress"
              ? "He started the Profile and hasn’t finished."
              : "He hasn’t started the Profile yet."}
          </p>
        )}
      </section>

      {customAssignments.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Custom assessments</h2>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {customAssignments.map(({ assignment, assessment }) => (
              <li key={assignment.id}>
                <Link
                  href={`/manager/assessments/${assessment.id}/responses/${participant.fatherId}`}
                  className={cn(
                    "flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                    interactiveSurfaceClassName
                  )}
                >
                  <span className="font-medium">{assessment.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {ASSIGNMENT_STATUS_LABEL[assignment.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {progress.length === 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Trainings</h2>
          <EmptyState
            framed={false}
            className="mt-2 p-0"
            title="No trainings in the catalog"
          >
            An admin needs to add a training before you can assign work.
          </EmptyState>
        </section>
      ) : (
      <section className="grid gap-4 md:grid-cols-3">
        {progress.map((card) => {
          const percent =
            card.total === 0 ? 0 : Math.round((card.completed / card.total) * 100);
          return (
            <article key={card.training.id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-heading font-semibold">{card.training.title}</h3>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{percent}%</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {card.completed} of {card.total} sessions
                {card.assigned ? " · Assigned" : ""}
                {card.certificate ? " · Certified" : ""}
              </p>
              <ProgressBar value={percent} className="mt-4" />
              {card.certificate ? (
                <div className="mt-4 space-y-3">
                  <p className="font-mono text-xs text-muted-foreground">
                    {card.certificate.serial_number}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <CertificateDownloadLink
                      certificateId={card.certificate.id}
                      className="w-full sm:w-auto"
                    />
                    <Link
                      href={`/manager/participants/${participant.fatherId}/certificates/${card.training.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full sm:w-auto")}
                    >
                      View
                    </Link>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
      )}

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Current session</h2>
        {current ? (
          <>
            <p className="mt-2 text-muted-foreground">
              {current.session.title} · Session {current.session.session_number}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 sm:gap-5">
              <Step done={current.progress?.film_completed ?? false} label="Film" />
              <Step done={current.progress?.checkin_completed ?? false} label="Check-in" />
              <Step done={current.progress?.action_completed ?? false} label="Action" />
            </div>
          </>
        ) : (
          <EmptyState
            framed={false}
            className="mt-2 p-0"
            title={
              progress.length === 0
                ? "No trainings to continue"
                : progress.some((card) => card.assigned)
                  ? "All sessions complete"
                  : "No training assigned"
            }
          >
            {progress.length === 0
              ? "An admin needs to add a training to the catalog first."
              : progress.some((card) => card.assigned)
                ? "Every session in the catalog is complete. You can send a certificate below."
                : "Assign a training below so he has a next session."}
          </EmptyState>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <form action={assignTraining} className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-semibold">Assign Training</h2>
          <p className="mt-1 text-sm text-muted-foreground">Adds this training to his path.</p>
          <input type="hidden" name="father_id" value={participant.fatherId} />
          <div className="mt-4">
            {assignable.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No trainings are available to assign yet. Review new releases
                from the dashboard, or wait for an admin to publish one.
              </p>
            ) : unassigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Every available training is already assigned.
              </p>
            ) : (
              <select
                className={fieldClassName}
                name="training_id"
                required
                aria-invalid={Boolean(flash.error) || undefined}
              >
                {unassigned.map((card) => (
                  <option key={card.training.id} value={card.training.id}>
                    {card.training.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          {unassigned.length > 0 ? (
            <Button type="submit" className="mt-4 w-full">
              Assign Training
            </Button>
          ) : null}
        </form>

        <form action={markTrainingComplete} className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-semibold">Mark Training Complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Marks every session in that training done.
          </p>
          <input type="hidden" name="father_id" value={participant.fatherId} />
          <div className="mt-4">
            {progress.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No trainings in the catalog yet. An admin needs to add one.
              </p>
            ) : (
              <select
                className={fieldClassName}
                name="training_id"
                required
                aria-invalid={Boolean(flash.error) || undefined}
              >
                {progress.map((card) => (
                  <option key={card.training.id} value={card.training.id}>
                    {card.training.title}
                    {card.completed === card.total && card.total > 0 ? " (done)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          {progress.length > 0 ? (
            <Button type="submit" className="mt-4 w-full">
              Mark Training Complete
            </Button>
          ) : null}
        </form>

        <form action={previewCertificate} className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-semibold">Send Certificate</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview, then issue a serial and downloadable PDF.
          </p>
          <input type="hidden" name="father_id" value={participant.fatherId} />
          <div className="mt-4">
            {progress.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No trainings in the catalog yet. An admin needs to add one.
              </p>
            ) : withoutCert.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Certificates are only issued after a training is fully complete.
                {progress.some((card) => !card.certificate)
                  ? " Finish the remaining sessions first."
                  : " A certificate is already on file for each completed training."}
              </p>
            ) : (
              <select
                className={fieldClassName}
                name="training_id"
                required
                aria-invalid={Boolean(flash.error) || undefined}
              >
                {withoutCert.map((card) => (
                  <option key={card.training.id} value={card.training.id}>
                    {card.training.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          {withoutCert.length > 0 ? (
            <Button type="submit" className="mt-4 w-full">
              Preview Certificate
            </Button>
          ) : null}
        </form>
      </section>
    </div>
  );
}
