import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { NudgeForm } from "@/components/manager/nudge-form";
import { ParticipantBulkList } from "@/components/manager/participant-bulk-list";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { isTrainingAssignable, reviewForGroup } from "@/lib/manager/reviews";
import {
  cooldownRemaining,
  latestSentAt,
  loadNudgeHistory,
  loadReminderPrefs,
  needsNudge,
  quietLabel,
} from "@/lib/manager/nudges";
import { formatShortDate } from "@/lib/manager/types";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const { participants, trainings, sessions, groups, reviews, trainingProgressFor } =
    await loadManagerWorkspace(user.id);
  const quiet = participants.filter((participant) =>
    needsNudge(participant.lastActivity, trainingProgressFor(participant.fatherId))
  );
  const quietIds = quiet.map((row) => row.fatherId);
  const [{ byFather: historyByFather, unavailable: historyUnavailable }, reminderPrefs] =
    await Promise.all([loadNudgeHistory(quietIds), loadReminderPrefs(quietIds)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Participants
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fathers in your group. Open anyone, or select several for a reviewed
          bulk action.
        </p>
      </div>
      <Flash error={params.error} notice={params.notice} />

      {quiet.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Gone quiet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No activity in 14 days, and training is still open. A nudge emails
            only if he left session reminders on.
          </p>
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {quiet.map((participant) => {
              const history = historyByFather.get(participant.fatherId) ?? [];
              const remaining = cooldownRemaining(history);
              const lastSent = latestSentAt(history);
              const remindersAllowed = reminderPrefs.get(participant.fatherId);
              return (
                <li
                  key={participant.fatherId}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/manager/participants/${participant.fatherId}#nudge`}
                      className={cn("font-medium", interactiveLinkClassName)}
                    >
                      {participant.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {quietLabel(participant.lastActivity)}
                      {lastSent
                        ? ` · Last nudge ${formatShortDate(lastSent)}`
                        : ""}
                    </p>
                  </div>
                  {historyUnavailable ? (
                    <p className="text-sm text-muted-foreground">
                      Couldn’t check recent reminders.
                    </p>
                  ) : remindersAllowed === false ? (
                    <p className="text-sm text-muted-foreground">Reminders off</p>
                  ) : remaining > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {remaining === 1
                        ? "Another reminder tomorrow"
                        : `Another reminder in ${remaining} days`}
                    </p>
                  ) : (
                    <NudgeForm
                      fatherId={participant.fatherId}
                      defaultTemplate="continue"
                      returnTo="list"
                      compact
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {participants.length === 0 ? (
        <EmptyState
          title="No one has joined yet"
          actionHref="/manager"
          actionLabel="Open dashboard"
        >
          Share your invite code from the Dashboard so fathers can create an
          account.
        </EmptyState>
      ) : (
        <ParticipantBulkList
          participants={participants.map((participant) => ({
            fatherId: participant.fatherId,
            name: participant.name,
            avatarUrl: participant.avatarUrl,
            groupName: participant.groupName,
            profileStatus: participant.profileStatus,
            progressLabel: participant.progressLabel,
            lastActivity: participant.lastActivity,
            quiet: needsNudge(
              participant.lastActivity,
              trainingProgressFor(participant.fatherId)
            ),
          }))}
          trainings={trainings.map((training) => ({
            id: training.id,
            title: training.title,
            published: groups.some((group) =>
              isTrainingAssignable(
                training,
                reviewForGroup(reviews, group.id, training.id)?.status
              )
            ),
          }))}
          sessions={sessions.map((session) => ({
            id: session.id,
            trainingId: session.training_id,
            title: session.title,
            sessionNumber: session.session_number,
          }))}
        />
      )}
    </div>
  );
}
