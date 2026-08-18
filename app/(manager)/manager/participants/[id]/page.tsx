import Link from "next/link";
import { notFound } from "next/navigation";

import { CertificateDownloadLink } from "@/components/certificates/download-link";
import { CompanionNudgeSuggest } from "@/components/manager/companion-nudge-suggest";
import { Flash } from "@/components/manager/flash";
import { NudgeForm } from "@/components/manager/nudge-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { loadParticipantCustomAssignments } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import {
  assignTraining,
  markTrainingComplete,
  previewCertificate,
} from "@/lib/manager/actions";
import { buildQuietSuggestion } from "@/lib/manager/companion";
import { loadManagedParticipant } from "@/lib/manager/data";
import { isTrainingAssignable, reviewForGroup } from "@/lib/manager/reviews";
import { saveParticipantNote } from "@/lib/manager/note-actions";
import { NOTE_MAX_LENGTH, loadParticipantNotes } from "@/lib/manager/notes";
import { loadNudgeHistory, loadReminderPrefAllowed } from "@/lib/manager/nudge-data";
import { cooldownRemaining, isNudgeTemplate, needsNudge } from "@/lib/manager/nudges";
import {
  translateAssignmentStatus,
  translateNudgeStatus,
  translateNudgeTemplate,
  translateQuietLabel,
  translateThemeLabel,
} from "@/lib/i18n/flash";
import { formatShortDate, formatShortDateTime } from "@/lib/i18n/server";
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
        {label}
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
  const { t, locale } = await getI18n();
  const detail = await loadManagedParticipant(user.id, id);

  if (!detail) {
    notFound();
  }

  const { participant, progress, reviews } = detail;
  const [customAssignments, historyByFather, remindersAllowed, notes] = await Promise.all([
    loadParticipantCustomAssignments(user.id, id),
    loadNudgeHistory([id]),
    loadReminderPrefAllowed(id),
    loadParticipantNotes(id),
  ]);
  const nudgeHistory = historyByFather.byFather.get(id) ?? [];
  const historyUnavailable = historyByFather.unavailable;
  const quiet = needsNudge(participant.lastActivity, progress);
  const cooldown = cooldownRemaining(nudgeHistory);
  const companionSuggestion = quiet
    ? buildQuietSuggestion(
        participant,
        progress,
        nudgeHistory,
        remindersAllowed,
        historyUnavailable
      )
    : null;
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
          {t("manager.participants.title")}
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
            {participant.groupName} · {t("manager.participants.joined", { date: formatShortDate(participant.joinedAt, locale) })}
            {quiet ? ` · ${translateQuietLabel(participant.lastActivity, t)}` : ""}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">{t("manager.participants.privateNote")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.participants.privateNoteLead", { name: participant.groupName })}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("manager.participants.noteComposerLead")}
        </p>
        <form action={saveParticipantNote} className="mt-5 space-y-4">
          <input type="hidden" name="father_id" value={participant.fatherId} />
          <label className="block space-y-2">
            <span className="sr-only">{t("manager.participants.privateNote")}</span>
            <textarea
              key={notes[0]?.id ?? "new"}
              className={textareaClassName}
              name="body"
              maxLength={NOTE_MAX_LENGTH}
              rows={4}
              defaultValue=""
              placeholder={t("manager.participants.privateNotePlaceholder")}
              aria-invalid={Boolean(flash.error) || undefined}
            />
          </label>
          <div className="flex justify-end">
            <Button type="submit" className="w-full sm:w-auto">
              {t("manager.participants.saveNote")}
            </Button>
          </div>
        </form>
        {notes.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-medium">{t("manager.participants.notesLog")}</h3>
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {notes.map((entry) => (
                <li key={entry.id} className="px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap">{entry.body}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("manager.participants.noteSavedAt", {
                      date: formatShortDateTime(entry.createdAt, locale),
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            {t("manager.participants.notesEmpty")}
          </p>
        )}
      </section>

      {quiet || withoutCert.length > 0 ? (
        <section className="rounded-xl border border-primary/35 bg-card p-4 sm:p-6">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            {t("manager.companion.eyebrow")}
          </p>
          <h2 className="font-heading mt-2 text-lg font-semibold">
            {t("manager.companion.detailTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.companion.detailLead")}
          </p>
          {withoutCert[0] ? (
            <div className="mt-5 rounded-lg border border-border bg-black/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {t("manager.companion.detailCert", { title: withoutCert[0].training.title })}
              </p>
              <Link
                href={`/manager/participants/${participant.fatherId}/certificates/${withoutCert[0].training.id}`}
                className={cn(buttonVariants({ variant: "outline" }), "mt-3 w-full sm:w-auto")}
              >
                {t("manager.participants.previewCertificate")}
              </Link>
            </div>
          ) : null}
          {companionSuggestion ? (
            <div className="mt-5">
              <CompanionNudgeSuggest
                fatherId={participant.fatherId}
                template={companionSuggestion.template}
                reason={companionSuggestion.reason}
                whyTemplate={companionSuggestion.whyTemplate}
                canNudge={companionSuggestion.canNudge}
                block={companionSuggestion.block}
                cooldownDays={companionSuggestion.cooldownDays}
                returnTo="detail"
                defaultOpen
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <section
        id="nudge"
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <h2 className="font-heading text-lg font-semibold">{t("manager.participants.sendNudge")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {quiet
            ? t("manager.participants.nudgeQuiet", {
                quiet: translateQuietLabel(participant.lastActivity, t),
              })
            : t("manager.participants.nudgeActive")}
        </p>
        {historyUnavailable ? (
          <p className="mt-4 rounded-xl border border-border bg-black/30 px-4 py-3 text-sm text-muted-foreground">
            {t("manager.participants.nudgeCheckFailed")}
          </p>
        ) : remindersAllowed === false ? (
          <p className="mt-4 rounded-xl border border-border bg-black/30 px-4 py-3 text-sm text-muted-foreground">
            {t("manager.participants.remindersOffLong")}
          </p>
        ) : cooldown > 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {cooldown === 1
              ? t("manager.participants.nudgeTomorrow")
              : t("manager.participants.nudgeInDays", { days: cooldown })}
          </p>
        ) : (
          <div className="mt-5">
            <NudgeForm
              fatherId={participant.fatherId}
              defaultTemplate={companionSuggestion?.template ?? "continue"}
            />
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {(["continue", "encouragement", "welcome_back"] as const).map((key) => {
                const template = translateNudgeTemplate(key, t);
                return (
                  <li key={key}>
                    <span className="font-medium text-foreground">{template.label}.</span>{" "}
                    {template.preview}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {nudgeHistory.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-medium">{t("manager.participants.nudgeHistory")}</h3>
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {nudgeHistory.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm">
                    {isNudgeTemplate(row.template_key)
                      ? translateNudgeTemplate(row.template_key, t).label
                      : row.template_key}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {translateNudgeStatus(row.status, t)} · {formatShortDate(row.sent_at, locale)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">{t("manager.participants.noNudges")}</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">{t("manager.participants.fatherProfile")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.participants.fatherProfileLead")}
        </p>
        {participant.profile ? (
          <p className="mt-3 text-muted-foreground">
            {t("manager.participants.profileCompleted", {
              date: formatShortDate(participant.profile.taken_at, locale),
            })}
            {participant.profile.primary_edge
              ? ` · ${t("manager.participants.primaryEdge", {
                  edge: translateThemeLabel(participant.profile.primary_edge, t),
                })}`
              : ""}
            {participant.profile.primary_determination
              ? ` · ${t("manager.participants.determination", {
                  determination: translateThemeLabel(participant.profile.primary_determination, t),
                })}`
              : ""}
          </p>
        ) : (
          <p className="mt-3 text-muted-foreground">
            {participant.profileStatus === "in_progress"
              ? t("manager.participants.profileInProgress")
              : t("manager.participants.profileNotStarted")}
          </p>
        )}
      </section>

      {customAssignments.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("manager.participants.assessments")}</h2>
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
                    {translateAssignmentStatus(assignment.status, t)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {progress.length === 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("manager.participants.trainings")}</h2>
          <EmptyState
            framed={false}
            className="mt-2 p-0"
            title={t("manager.participants.noCatalogTitle")}
          >
            {t("manager.participants.noCatalogBody")}
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
                {card.training.part_number && card.training.part_total
                  ? `${t("manager.participants.partSubtitle", {
                      n: card.training.part_number,
                      total: card.training.part_total,
                      sessions: card.total,
                    })} · `
                  : ""}
                {t("manager.participants.sessionsOf", {
                  completed: card.completed,
                  total: card.total,
                })}
                {card.assigned ? ` · ${t("manager.participants.assigned")}` : ""}
                {card.certificate ? ` · ${t("manager.participants.certified")}` : ""}
              </p>
              {card.gated ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("manager.participants.gatedPart", {
                    n: (card.training.part_number ?? 1) - 1,
                  })}
                </p>
              ) : null}
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
                      {t("manager.participants.view")}
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
        <h2 className="font-heading text-lg font-semibold">{t("manager.participants.currentSession")}</h2>
        {current ? (
          <>
            <p className="mt-2 text-muted-foreground">
              {current.session.title} · {t("manager.participants.sessionN", { n: current.session.session_number })}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 sm:gap-5">
              <Step
                done={current.progress?.film_completed ?? false}
                label={t(
                  current.progress?.film_completed
                    ? "manager.participants.stepDone"
                    : "manager.participants.stepPending",
                  { label: t("father.session.film") }
                )}
              />
              <Step
                done={current.progress?.checkin_completed ?? false}
                label={t(
                  current.progress?.checkin_completed
                    ? "manager.participants.stepDone"
                    : "manager.participants.stepPending",
                  { label: t("father.session.checkin") }
                )}
              />
              <Step
                done={current.progress?.action_completed ?? false}
                label={t(
                  current.progress?.action_completed
                    ? "manager.participants.stepDone"
                    : "manager.participants.stepPending",
                  { label: t("father.session.action") }
                )}
              />
            </div>
          </>
        ) : (
          <EmptyState
            framed={false}
            className="mt-2 p-0"
            title={
              progress.length === 0
                ? t("manager.participants.noContinueTitle")
                : progress.some((card) => card.assigned)
                  ? t("manager.participants.allCompleteTitle")
                  : t("manager.participants.noAssignedTitle")
            }
          >
            {progress.length === 0
              ? t("manager.participants.noContinueBody")
              : progress.some((card) => card.assigned)
                ? t("manager.participants.allCompleteBody")
                : t("manager.participants.noAssignedBody")}
          </EmptyState>
        )}
      </section>

      <section
        id="certificates"
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
          {t("manager.certificates.eyebrow")}
        </p>
        <h2 className="font-heading mt-2 text-lg font-semibold">
          {t("manager.certificates.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.participants.sendCertificateLead")}
        </p>
        <form action={previewCertificate} className="mt-5 space-y-4">
          <input type="hidden" name="father_id" value={participant.fatherId} />
          {progress.length === 0 ? (
            <p className="rounded-lg border border-border bg-black/30 px-4 py-3 text-sm text-muted-foreground">
              {t("manager.participants.noCatalogYet")}
            </p>
          ) : withoutCert.length === 0 ? (
            <p className="rounded-lg border border-border bg-black/30 px-4 py-3 text-sm text-muted-foreground">
              {t("manager.participants.certOnlyComplete")}{" "}
              {progress.some((card) => !card.certificate)
                ? t("manager.participants.finishSessions")
                : t("manager.participants.certOnFile")}
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
          {withoutCert.length > 0 ? (
            <Button type="submit" className="w-full sm:w-auto">
              {t("manager.participants.previewCertificate")}
            </Button>
          ) : null}
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <form action={assignTraining} className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-semibold">{t("manager.participants.assignTraining")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("manager.participants.assignLead")}</p>
          <input type="hidden" name="father_id" value={participant.fatherId} />
          <div className="mt-4">
            {assignable.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("manager.participants.noneAssignable")}
              </p>
            ) : unassigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("manager.participants.allAssigned")}
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
              {t("manager.participants.assignTraining")}
            </Button>
          ) : null}
        </form>

        <form action={markTrainingComplete} className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading font-semibold">{t("manager.participants.markComplete")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.participants.markCompleteLead")}
          </p>
          <input type="hidden" name="father_id" value={participant.fatherId} />
          <div className="mt-4">
            {progress.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("manager.participants.noCatalogYet")}
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
                    {card.completed === card.total && card.total > 0
                      ? ` ${t("manager.participants.doneSuffix")}`
                      : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          {progress.length > 0 ? (
            <Button type="submit" className="mt-4 w-full">
              {t("manager.participants.markComplete")}
            </Button>
          ) : null}
        </form>
      </section>
    </div>
  );
}
