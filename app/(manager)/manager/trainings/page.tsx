import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import {
  ReviewDecisionForms,
  ReviewStatusBadge,
} from "@/components/manager/review-decision-forms";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { isLegacyCatalogTraining, isTrainingPublished } from "@/lib/father/types";
import { requireRole } from "@/lib/auth/session";
import { formatShortDate, getI18n } from "@/lib/i18n/server";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { loadReviewQueue } from "@/lib/manager/reviews";
import { assignTrainingToUnassigned } from "@/lib/manager/training-actions";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function sessionLabel(
  count: number,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  return count === 1
    ? t("manager.dashboard.sessionOne")
    : t("manager.dashboard.sessionMany", { count });
}

export default async function ManagerTrainingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const { t, locale } = await getI18n();
  const [{ pending, history, unread, groups }, workspace] = await Promise.all([
    loadReviewQueue(user.id),
    loadManagerWorkspace(user.id),
  ]);
  const orgName = groups[0]?.name ?? t("account.orgPhotosFallback");
  const accepted = history.filter((item) => item.review.status === "accepted");
  const declined = history.filter((item) => item.review.status === "declined");
  const acceptedIds = new Set(accepted.map((item) => item.training.id));
  const legacy = workspace.trainings.filter(
    (training) =>
      isTrainingPublished(training) &&
      isLegacyCatalogTraining(training) &&
      !acceptedIds.has(training.id)
  );

  function assignedCount(trainingId: string, groupId?: string) {
    return workspace.participants.filter((participant) => {
      if (groupId && participant.groupId !== groupId) return false;
      return workspace
        .trainingProgressFor(participant.fatherId)
        .some((card) => card.training.id === trainingId && card.assigned);
    }).length;
  }

  function groupSize(groupId?: string) {
    return workspace.participants.filter((participant) =>
      groupId ? participant.groupId === groupId : true
    ).length;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("manager.trainings.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.trainings.lead", { org: orgName })}
          </p>
        </div>
        <Link
          href="/manager/request"
          className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-11 sm:w-auto")}
        >
          {t("manager.reviews.request")}
        </Link>
      </div>
      <Flash error={params.error} notice={params.notice} />

      {unread.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("manager.reviews.notifications")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread.length === 1
              ? t("manager.reviews.waitingOne")
              : t("manager.reviews.waitingMany", { count: unread.length })}
          </p>
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {unread.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={cn("block px-4 py-3", interactiveSurfaceClassName)}>
                  <span className="block font-medium">{item.title}</span>
                  {item.body ? (
                    <span className="mt-0.5 block text-sm text-muted-foreground">{item.body}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="pending" className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("manager.trainings.waitingTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("manager.trainings.waitingLead")}</p>
        </div>
        {pending.length === 0 ? (
          <EmptyState title={t("manager.trainings.waitingEmptyTitle")}>
            {t("manager.trainings.waitingEmptyBody")}
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {pending.map((item) => (
              <article
                key={`${item.review.group_id}-${item.training.id}`}
                className="rounded-xl border border-border bg-card p-4 sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-heading text-lg font-semibold">{item.training.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sessionLabel(item.sessionCount, t)}
                      {groups.length > 1 ? ` · ${item.groupName}` : ""}
                    </p>
                  </div>
                  <ReviewStatusBadge status={item.review.status} />
                </div>
                {item.training.description ? (
                  <p className="mt-4 text-sm text-muted-foreground">{item.training.description}</p>
                ) : null}
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/manager/reviews/${item.training.id}?group=${item.review.group_id}`}
                    className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-11 sm:w-auto")}
                  >
                    {t("manager.trainings.preview")}
                  </Link>
                </div>
                <div className="mt-5 border-t border-border pt-5">
                  <ReviewDecisionForms
                    trainingId={item.training.id}
                    groupId={item.review.group_id}
                    status={item.review.status}
                    returnTo="trainings"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="cohort" className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("manager.trainings.cohortTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("manager.trainings.cohortLead")}</p>
        </div>
        {accepted.length === 0 && legacy.length === 0 ? (
          <EmptyState title={t("manager.trainings.cohortEmptyTitle")}>
            {t("manager.trainings.cohortEmptyBody")}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {accepted.map((item) => {
              const assigned = assignedCount(item.training.id, item.review.group_id);
              const total = groupSize(item.review.group_id);
              const remaining = Math.max(0, total - assigned);
              return (
                <li key={`${item.review.group_id}-${item.training.id}`} className="px-4 py-5 sm:px-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <Link
                        href={`/manager/reviews/${item.training.id}?group=${item.review.group_id}`}
                        className={cn("block font-medium", interactiveLinkClassName)}
                      >
                        {item.training.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("manager.trainings.assignedOf", { assigned, total })}
                        {item.review.decided_at
                          ? ` · ${t("manager.trainings.acceptedOn", {
                              date: formatShortDate(item.review.decided_at, locale),
                            })}`
                          : ""}
                        {groups.length > 1 ? ` · ${item.groupName}` : ""}
                      </p>
                    </div>
                    <ReviewStatusBadge status={item.review.status} />
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {remaining > 0 ? (
                      <form action={assignTrainingToUnassigned}>
                        <input type="hidden" name="training_id" value={item.training.id} />
                        <input type="hidden" name="group_id" value={item.review.group_id} />
                        <Button type="submit" className="w-full min-h-11 sm:w-auto">
                          {t("manager.trainings.assignRemaining", { n: remaining })}
                        </Button>
                      </form>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("manager.trainings.allAssigned")}
                      </p>
                    )}
                    <Link
                      href={`/manager/participants?training=${item.training.id}#assign`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full min-h-11 sm:w-auto"
                      )}
                    >
                      {t("manager.trainings.chooseFathers")}
                    </Link>
                    <Link
                      href={`/manager/reviews/${item.training.id}?group=${item.review.group_id}`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full min-h-11 sm:w-auto"
                      )}
                    >
                      {t("manager.trainings.preview")}
                    </Link>
                  </div>
                  <div className="mt-5 border-t border-border pt-5">
                    <p className="mb-3 text-sm text-muted-foreground">
                      {t("manager.trainings.removeLead")}
                    </p>
                    <ReviewDecisionForms
                      trainingId={item.training.id}
                      groupId={item.review.group_id}
                      status={item.review.status}
                      returnTo="trainings"
                      declineReason={item.review.decline_reason}
                    />
                  </div>
                </li>
              );
            })}
            {legacy.map((training) => {
              const assigned = assignedCount(training.id);
              const total = groupSize();
              const remaining = Math.max(0, total - assigned);
              return (
                <li key={training.id} className="px-4 py-5 sm:px-6">
                  <div className="min-w-0">
                    <p className="font-medium">{training.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("manager.trainings.assignedOf", { assigned, total })}
                      {` · ${t("manager.trainings.catalogItem")}`}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {remaining > 0 ? (
                      <form action={assignTrainingToUnassigned}>
                        <input type="hidden" name="training_id" value={training.id} />
                        <Button type="submit" className="w-full min-h-11 sm:w-auto">
                          {t("manager.trainings.assignRemaining", { n: remaining })}
                        </Button>
                      </form>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("manager.trainings.allAssigned")}
                      </p>
                    )}
                    <Link
                      href={`/manager/participants?training=${training.id}#assign`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full min-h-11 sm:w-auto"
                      )}
                    >
                      {t("manager.trainings.chooseFathers")}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="hidden" className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("manager.trainings.hiddenTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("manager.trainings.hiddenLead")}</p>
        </div>
        {declined.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-5 sm:px-6">
            <p className="text-sm text-muted-foreground">{t("manager.trainings.hiddenEmpty")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {declined.map((item) => {
              const href = item.training.released_at
                ? `/manager/reviews/${item.training.id}?group=${item.review.group_id}`
                : null;
              return (
                <li key={`${item.review.group_id}-${item.training.id}`} className="px-4 py-5 sm:px-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      {href ? (
                        <Link href={href} className={cn("block font-medium", interactiveLinkClassName)}>
                          {item.training.title}
                        </Link>
                      ) : (
                        <span className="block font-medium">{item.training.title}</span>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatShortDate(item.review.decided_at, locale)}
                        {groups.length > 1 ? ` · ${item.groupName}` : ""}
                      </p>
                    </div>
                    <ReviewStatusBadge status={item.review.status} />
                  </div>
                  {item.review.decline_reason ? (
                    <p className="mt-2 text-sm text-muted-foreground">{item.review.decline_reason}</p>
                  ) : null}
                  {item.training.released_at ? (
                    <div className="mt-4 border-t border-border pt-4">
                      <ReviewDecisionForms
                        trainingId={item.training.id}
                        groupId={item.review.group_id}
                        status={item.review.status}
                        returnTo="trainings"
                        declineReason={item.review.decline_reason}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
