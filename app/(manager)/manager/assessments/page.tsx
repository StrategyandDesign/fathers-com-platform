import Link from "next/link";

import { AssessmentReviewForms } from "@/components/manager/assessment-review-forms";
import { AssessmentVisibilityForms } from "@/components/manager/assessment-visibility-forms";
import { Flash } from "@/components/manager/flash";
import { ReviewStatusBadge } from "@/components/manager/review-decision-forms";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  loadPlatformCompletionsByGroup,
  loadPlatformReleases,
  loadPublishedPlatformAssessments,
} from "@/lib/admin/platform-assessment-data";
import { assignAssessmentToUnassigned } from "@/lib/assessments/actions";
import { KEYSTONE_ASSESSMENT_KEY } from "@/lib/assessments/availability";
import {
  buildManagerAssessmentCatalog,
  partitionAssessmentCatalog,
  type AssessmentCatalogItem,
} from "@/lib/assessments/catalog";
import {
  loadAssessmentAvailability,
  loadManagerAssessments,
  loadOrganizationAssessmentReviews,
  loadPlatformAssessmentRelease,
} from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { loadManagerNotifications } from "@/lib/manager/reviews";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function questionLabel(
  count: number,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  return count === 1
    ? t("manager.assessments.questionOne")
    : t("manager.assessments.questionMany", { count });
}

function AssessmentCard({
  item,
  title,
  remaining,
  t,
}: {
  item: AssessmentCatalogItem;
  title: string;
  remaining: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href={item.href} className={cn("block font-heading text-lg font-semibold", interactiveLinkClassName)}>
            {title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              item.kind === "custom" ? null : t("manager.assessments.platform"),
              questionLabel(item.questionCount, t),
              item.kind === "custom"
                ? t("manager.assessments.completedOf", {
                    completed: item.completedCount,
                    assigned: item.assignedCount,
                  })
                : t("manager.assessments.completedOfRoster", {
                    completed: item.completedCount,
                    total: item.assignedCount,
                  }),
              item.groupName,
              item.status === "hidden"
                ? t("manager.assessments.hidden")
                : t("manager.assessments.available"),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {item.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={item.href}
          className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-11 sm:w-auto")}
        >
          {t("manager.assessments.view")}
        </Link>
        {item.kind === "custom" && item.customId && item.status === "available" && remaining > 0 ? (
          <form action={assignAssessmentToUnassigned}>
            <input type="hidden" name="assessment_id" value={item.customId} />
            <input type="hidden" name="group_id" value={item.groupId} />
            <Button type="submit" className="w-full min-h-11 sm:w-auto">
              {t("manager.assessments.assignRemaining", { n: remaining })}
            </Button>
          </form>
        ) : null}
      </div>
      {item.groupId && item.section !== "pending" && item.section !== "declined" ? (
        <div className="mt-5 border-t border-border pt-5">
          <AssessmentVisibilityForms
            assessmentKey={item.assessmentKey}
            groupId={item.groupId}
            status={item.status}
            kind={item.kind}
            returnTo="list"
          />
        </div>
      ) : null}
    </article>
  );
}

export default async function ManagerAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const { t } = await getI18n();
  const [workspace, custom] = await Promise.all([
    loadManagerWorkspace(user.id),
    loadManagerAssessments(user.id),
  ]);
  const groupIds = workspace.groups.map((group) => group.id);
  const publishedPlatform = await loadPublishedPlatformAssessments();
  const [availability, reviews, keystoneRelease, notifications, platformReleases] =
    await Promise.all([
      loadAssessmentAvailability(groupIds),
      loadOrganizationAssessmentReviews(groupIds),
      loadPlatformAssessmentRelease(KEYSTONE_ASSESSMENT_KEY),
      loadManagerNotifications(user.id),
      loadPlatformReleases(publishedPlatform.map((row) => row.assessment_key)),
    ]);
  const platformCompletions = await Promise.all(
    publishedPlatform.map(async (row) => ({
      assessmentKey: row.assessment_key,
      counts: await loadPlatformCompletionsByGroup({
        assessmentId: row.id,
        groupIds,
      }),
    }))
  );
  const releaseByKey = new Map(platformReleases.map((row) => [row.assessment_key, row]));
  const completionsByKey = new Map(
    platformCompletions.map((row) => [row.assessmentKey, row.counts])
  );
  const unread = notifications.filter(
    (row) => !row.read_at && row.kind === "assessment_release"
  );
  const keystoneCompletedByGroup: Record<string, number> = {};
  const groupSize: Record<string, number> = {};
  for (const participant of workspace.participants) {
    groupSize[participant.groupId] = (groupSize[participant.groupId] ?? 0) + 1;
    if (participant.profileStatus === "completed") {
      keystoneCompletedByGroup[participant.groupId] =
        (keystoneCompletedByGroup[participant.groupId] ?? 0) + 1;
    }
  }

  const catalog = buildManagerAssessmentCatalog({
    groups: workspace.groups.map((group) => ({ id: group.id, name: group.name })),
    custom,
    availability,
    keystoneCompletedByGroup,
    groupSize,
    reviews,
    keystoneRelease,
    platform: publishedPlatform.map((row) => ({
      assessmentKey: row.assessment_key,
      title: row.title,
      description: row.description,
      questionCount: row.questionCount,
      completedByGroup: Object.fromEntries(completionsByKey.get(row.assessment_key) ?? []),
      release: releaseByKey.get(row.assessment_key) ?? null,
    })),
  });
  const { pending, available, hidden, declined } = partitionAssessmentCatalog(catalog);
  const orgName = workspace.groups[0]?.name ?? t("account.orgPhotosFallback");
  const assignedByCustom = new Map(custom.map((row) => [row.id, row.assignedCount]));

  function remainingFor(item: AssessmentCatalogItem) {
    if (item.kind !== "custom" || !item.customId) return 0;
    const total = groupSize[item.groupId] ?? workspace.participants.length;
    const assigned = assignedByCustom.get(item.customId) ?? 0;
    return Math.max(0, total - assigned);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("manager.assessments.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.assessments.lead", { org: orgName })}
          </p>
        </div>
        <Link href="/manager/assessments/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
          {t("manager.assessments.new")}
        </Link>
      </div>
      <Flash error={params.error} notice={params.notice} />

      {unread.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("manager.reviews.notifications")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread.length === 1
              ? t("manager.assessmentReviews.waitingOne")
              : t("manager.assessmentReviews.waitingMany", { count: unread.length })}
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
          <h2 className="font-heading text-lg font-semibold">{t("manager.assessments.waitingTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("manager.assessments.waitingLead")}</p>
        </div>
        {pending.length === 0 ? (
          <EmptyState title={t("manager.assessments.waitingEmptyTitle")}>
            {t("manager.assessments.waitingEmptyBody")}
          </EmptyState>
        ) : (
          <div className="grid gap-4">
            {pending.map((item) => (
              <article key={item.key} className="rounded-xl border border-border bg-card p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-heading text-lg font-semibold">
                      {item.kind === "keystone" ? t("father.profile.keystone") : item.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[
                        t("manager.assessments.platform"),
                        questionLabel(item.questionCount, t),
                        item.groupName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {item.reviewStatus ? <ReviewStatusBadge status={item.reviewStatus} /> : null}
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={item.href}
                    className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-11 sm:w-auto")}
                  >
                    {t("manager.assessments.review")}
                  </Link>
                </div>
                {item.groupId && item.reviewStatus ? (
                  <div className="mt-5 border-t border-border pt-5">
                    <AssessmentReviewForms
                      assessmentKey={item.assessmentKey}
                      groupId={item.groupId}
                      status={item.reviewStatus}
                      returnTo="list"
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("manager.assessments.availableTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("manager.assessments.availableLead")}</p>
        </div>
        {available.length === 0 ? (
          <EmptyState title={t("manager.assessments.availableEmptyTitle")}>
            {t("manager.assessments.availableEmptyBody")}
          </EmptyState>
        ) : (
          <div className="grid gap-4">
            {available.map((item) => (
              <AssessmentCard
                key={item.key}
                item={item}
                title={
                  item.kind === "keystone" ? t("father.profile.keystone") : item.title ?? ""
                }
                remaining={remainingFor(item)}
                t={t}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("manager.assessments.hiddenTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("manager.assessments.hiddenLead")}</p>
        </div>
        {hidden.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-5 sm:px-6">
            <p className="text-sm text-muted-foreground">{t("manager.assessments.hiddenEmpty")}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {hidden.map((item) => (
              <AssessmentCard
                key={item.key}
                item={item}
                title={
                  item.kind === "keystone" ? t("father.profile.keystone") : item.title ?? ""
                }
                remaining={0}
                t={t}
              />
            ))}
          </div>
        )}
      </section>

      {declined.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              {t("manager.assessments.declinedTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("manager.assessments.declinedLead")}
            </p>
          </div>
          <div className="grid gap-4">
            {declined.map((item) => (
              <article key={item.key} className="rounded-xl border border-border bg-card p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-heading text-lg font-semibold">
                      {item.kind === "keystone" ? t("father.profile.keystone") : item.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[item.groupName, t("manager.reviews.declined")].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {item.reviewStatus ? <ReviewStatusBadge status={item.reviewStatus} /> : null}
                </div>
                {item.groupId && item.reviewStatus ? (
                  <div className="mt-5 border-t border-border pt-5">
                    <AssessmentReviewForms
                      assessmentKey={item.assessmentKey}
                      groupId={item.groupId}
                      status={item.reviewStatus}
                      returnTo="list"
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
