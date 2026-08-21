import Link from "next/link";

import { CompanionPanel } from "@/components/manager/companion-panel";
import { ParticipationModeCard } from "@/components/manager/participation-mode-card";
import { CopyButton } from "@/components/manager/copy-button";
import { Flash } from "@/components/manager/flash";
import { NudgePanel } from "@/components/manager/nudge-panel";
import { ReviewStatusBadge } from "@/components/manager/review-decision-forms";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldClassName, initials, interactiveSurfaceClassName } from "@/lib/ui";
import { requireRole } from "@/lib/auth/session";
import { translateAttention } from "@/lib/i18n/flash";
import { getI18n } from "@/lib/i18n/server";
import { scheduleDueReminderFlush } from "@/lib/jobs/flush-due-work";
import { createGroup } from "@/lib/manager/actions";
import {
  buildCompanionBriefing,
  organizationLabel,
} from "@/lib/manager/companion";
import { loadManagerAssessments } from "@/lib/assessments/data";
import { CohortNoteDesk } from "@/components/manager/cohort-note-desk";
import { decorateCohortNoteDesk } from "@/lib/cohort-note/audience";
import { loadManagerCohortNotes } from "@/lib/cohort-note/data";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { loadNudgePanel } from "@/lib/manager/nudge-panel-data";
import { participationCopyKey, participationModeFromGroups } from "@/lib/participation";
import { loadNudgeHistory, loadReminderPrefs } from "@/lib/manager/nudge-data";
import { needsNudge } from "@/lib/manager/nudges";
import { loadReviewQueue } from "@/lib/manager/reviews";
import { cn } from "@/lib/utils";

export default async function ManagerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const { user, role } = await requireRole("manager");
  const { t } = await getI18n();
  scheduleDueReminderFlush();
  const [workspace, reviews, assessments, cohortNotes] = await Promise.all([
    loadManagerWorkspace(user.id),
    loadReviewQueue(user.id),
    loadManagerAssessments(user.id),
    loadManagerCohortNotes(user.id),
  ]);
  const nudgePanel = await loadNudgePanel({
    role,
    managerId: user.id,
    workspace,
    t,
  });
  const {
    groups,
    summary,
    needsAttention,
    participants,
    trainingProgressFor,
    certificates,
  } = workspace;
  const quietIds = participants
    .filter((participant) =>
      needsNudge(participant.lastActivity, trainingProgressFor(participant.fatherId))
    )
    .map((participant) => participant.fatherId);
  const [{ byFather: historyByFather, unavailable: historyUnavailable }, reminderPrefs] =
    await Promise.all([loadNudgeHistory(quietIds), loadReminderPrefs(quietIds)]);
  const companion = buildCompanionBriefing({
    organizationName: organizationLabel(
      groups.map((group) => group.name),
      t("manager.impact.yourOrg")
    ),
    participants,
    trainingProgressFor,
    certificatesIssued: certificates.length,
    historyByFather,
    reminderPrefs,
    historyUnavailable,
    limit: 4,
  });

  const participationMode = participationModeFromGroups(groups);

  const stats = [
    { label: t("manager.dashboard.active"), value: summary.activeParticipants },
    {
      label: t("manager.dashboard.assessmentsCompleted"),
      value: assessments.reduce((count, item) => count + item.completedCount, 0),
    },
    { label: t("manager.dashboard.sessions"), value: summary.sessionsCompleted },
    { label: t("manager.dashboard.trainings"), value: summary.trainingsCompleted },
    { label: t("manager.dashboard.pending"), value: summary.pendingActions },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("manager.dashboard.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(participationCopyKey(participationMode, "manager.dashboard.lead"))}
          </p>
        </div>
      </div>
      <Flash error={params.error} notice={params.notice} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("manager.dashboard.inviteTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.dashboard.inviteLead")}
          </p>
          {groups.length > 0 ? (
            <div className="mt-5 space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex flex-col gap-3 rounded-lg border border-input bg-black/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{group.name}</p>
                    <p className="break-all font-mono text-sm tracking-wide">{group.invite_code}</p>
                  </div>
                  <CopyButton value={group.invite_code} className="w-full sm:w-auto" />
                </div>
              ))}
            </div>
          ) : (
            <form action={createGroup} className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">{t("manager.dashboard.groupName")}</span>
                <input
                  className={fieldClassName}
                  name="name"
                  defaultValue="Pilot Group"
                  required
                  aria-invalid={Boolean(params.error) || undefined}
                />
              </label>
              <Button type="submit" className="w-full sm:w-auto">
                {t("manager.dashboard.createGroup")}
              </Button>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("manager.dashboard.attention")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.dashboard.attentionLead")}
          </p>
          <div className="mt-5">
            {needsAttention.length === 0 ? (
              <EmptyState
                framed={false}
                className="p-0"
                title={t("manager.dashboard.caughtUp")}
              >
                {t("manager.dashboard.caughtUpBody")}
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {needsAttention.map((item) => (
                  <li key={`${item.fatherId}-${item.reason}`}>
                    <Link
                      href={`/manager/participants/${item.fatherId}`}
                      className={cn("flex items-center gap-3 px-3 py-3", interactiveSurfaceClassName)}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
                        {initials(item.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.name}</span>
                        <span className="block text-sm text-muted-foreground">
                          {translateAttention(item.reason, t)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            href="/manager/participants#assign"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            {t("manager.dashboard.viewParticipants")}
          </Link>
        </div>
      </section>

      <CohortNoteDesk
        viewerId={user.id}
        groups={decorateCohortNoteDesk(cohortNotes, {
          trainings: workspace.trainings,
          reviews: workspace.reviews,
          participants: workspace.participants,
          assignments: workspace.assignments,
        })}
      />
      <CompanionPanel briefing={companion} mode={participationMode} t={t} />

      {reviews.pending.length > 0 || reviews.unread.length > 0 ? (
        <section className="rounded-xl border border-primary/40 bg-card p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                {t("manager.dashboard.reviewTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("manager.dashboard.reviewLead")}
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
              <Link
                href="/manager/trainings"
                className={cn(buttonVariants(), "w-full sm:w-auto")}
              >
                {t("manager.dashboard.openQueue")}
              </Link>
            </div>
          </div>
          {reviews.unread.length > 0 ? (
            <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {reviews.unread.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn("block px-4 py-3", interactiveSurfaceClassName)}
                  >
                    <span className="block font-medium">{item.title}</span>
                    {item.body ? (
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {item.body}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {reviews.pending.slice(0, 3).map((item) => (
                <li key={`${item.review.group_id}-${item.training.id}`}>
                  <Link
                    href={`/manager/reviews/${item.training.id}?group=${item.review.group_id}`}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3",
                      interactiveSurfaceClassName
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {item.training.title}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {item.sessionCount === 1
                          ? t("manager.dashboard.sessionOne")
                          : t("manager.dashboard.sessionMany", { count: item.sessionCount })}
                      </span>
                    </span>
                    <ReviewStatusBadge status={item.review.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <ParticipationModeCard groups={groups} t={t} />
      <NudgePanel panel={nudgePanel} mode={participationMode} />

      <section className="rounded-xl border border-primary/40 bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">
          {t("manager.dashboard.practiceTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.dashboard.practiceLead")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("manager.dashboard.practiceNoCertificate")}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/manager/practice" className={cn(buttonVariants(), "w-full sm:w-auto")}>
            {t("manager.dashboard.practiceTraining")}
          </Link>
          <Link
            href="/manager/practice#assessments"
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            {t("manager.dashboard.practiceAssessment")}
          </Link>
        </div>
      </section>
    </div>
  );
}
