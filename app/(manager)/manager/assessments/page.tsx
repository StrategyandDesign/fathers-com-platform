import Link from "next/link";

import {
  AssessmentCatalog,
  AssessmentCatalogRow,
} from "@/components/manager/assessment-catalog";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
  loadPlatformAssessmentReleases,
} from "@/lib/assessments/data";
import {
  loadFirstPartyCatalogList,
  loadFirstPartyCompletedByGroup,
} from "@/lib/assessments/first-party-data";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { loadManagerNotifications } from "@/lib/manager/reviews";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

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
  const firstParty = await loadFirstPartyCatalogList();
  const [availability, reviews, keystoneRelease, firstPartyReleases, firstPartyCompleted, notifications] =
    await Promise.all([
      loadAssessmentAvailability(groupIds),
      loadOrganizationAssessmentReviews(groupIds),
      loadPlatformAssessmentRelease(KEYSTONE_ASSESSMENT_KEY),
      loadPlatformAssessmentReleases(firstParty.map((assessment) => assessment.key)),
      loadFirstPartyCompletedByGroup(
        groupIds,
        firstParty.map((assessment) => assessment.key)
      ),
      loadManagerNotifications(user.id),
    ]);
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
    firstParty,
    firstPartyReleases: Object.fromEntries(firstPartyReleases),
    firstPartyCompletedByGroup: firstPartyCompleted,
  });
  const { available, hidden } = partitionAssessmentCatalog(catalog);
  const inGroup = [...available, ...hidden];
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
        <Link href="/manager/assessments/new" className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-11 sm:w-auto")}>
          {t("manager.assessments.new")}
        </Link>
      </div>
      <Flash error={params.error} notice={params.notice} />
      <AssessmentCatalog items={catalog} remainingFor={remainingFor} t={t} />

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

      <section id="cohort" className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("manager.assessments.cohortTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("manager.assessments.cohortLead")}</p>
        </div>
        {inGroup.length === 0 ? (
          <EmptyState title={t("manager.assessments.cohortEmptyTitle")}>
            {t("manager.assessments.cohortEmptyBody")}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {inGroup.map((item) => (
              <li key={item.key} className="px-4 py-5 sm:px-6">
                <AssessmentCatalogRow item={item} remaining={remainingFor(item)} t={t} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
