import Link from "next/link";

import { CompanionNudgeSuggest } from "@/components/manager/companion-nudge-suggest";
import { Flash } from "@/components/manager/flash";
import { ParticipantBulkList } from "@/components/manager/participant-bulk-list";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { isTrainingAssignable, reviewForGroup } from "@/lib/manager/reviews";
import { buildQuietSuggestion } from "@/lib/manager/companion";
import { loadNudgeHistory, loadReminderPrefs } from "@/lib/manager/nudge-data";
import { latestSentAt, needsNudge } from "@/lib/manager/nudges";
import { formatShortDate } from "@/lib/manager/types";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; training?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const { t } = await getI18n();
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
          {t("manager.participants.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.participants.lead")}
        </p>
      </div>
      <Flash error={params.error} notice={params.notice} />

      {quiet.length > 0 ? (
        <section className="rounded-xl border border-primary/35 bg-card p-4 sm:p-6">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            {t("manager.companion.eyebrow")}
          </p>
          <h2 className="font-heading mt-2 text-lg font-semibold">
            {t("manager.companion.attentionTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.companion.attentionLead")}
          </p>
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {quiet.map((participant) => {
              const history = historyByFather.get(participant.fatherId) ?? [];
              const lastSent = latestSentAt(history);
              const suggestion = buildQuietSuggestion(
                participant,
                trainingProgressFor(participant.fatherId),
                history,
                reminderPrefs.get(participant.fatherId) ?? null,
                historyUnavailable
              );
              return (
                <li
                  key={participant.fatherId}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/manager/participants/${participant.fatherId}#nudge`}
                      className={cn("font-medium", interactiveLinkClassName)}
                    >
                      {participant.name}
                    </Link>
                    {lastSent ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("manager.participants.lastNudge", { date: formatShortDate(lastSent) })}
                      </p>
                    ) : null}
                  </div>
                  <div className="sm:max-w-sm">
                    <CompanionNudgeSuggest
                      fatherId={participant.fatherId}
                      template={suggestion.template}
                      reason={suggestion.reason}
                      whyTemplate={suggestion.whyTemplate}
                      canNudge={suggestion.canNudge}
                      block={suggestion.block}
                      cooldownDays={suggestion.cooldownDays}
                      returnTo="list"
                      compact
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {participants.length === 0 ? (
        <EmptyState
          title={t("manager.participants.emptyTitle")}
          actionHref="/manager"
          actionLabel={t("manager.participants.openDashboard")}
        >
          {t("manager.participants.emptyBody")}
        </EmptyState>
      ) : (
        <div id="assign">
          <ParticipantBulkList
            initialTrainingId={params.training}
            participants={participants.map((participant) => ({
            fatherId: participant.fatherId,
            name: participant.name,
            avatarUrl: participant.avatarUrl,
            groupName: participant.groupName,
            progressLabel: participant.progressLabel === "None assigned"
              ? t("manager.participants.noneAssigned")
              : participant.progressLabel.endsWith(" complete")
                ? t("manager.participants.trainingComplete", {
                    title: participant.progressLabel.slice(0, -" complete".length),
                  })
                : participant.progressLabel,
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
        </div>
      )}
    </div>
  );
}
