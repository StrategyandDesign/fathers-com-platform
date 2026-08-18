import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentReviewForms } from "@/components/manager/assessment-review-forms";
import { AssessmentVisibilityForms } from "@/components/manager/assessment-visibility-forms";
import { Flash } from "@/components/manager/flash";
import { ReviewStatusBadge } from "@/components/manager/review-decision-forms";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadPublishedPlatformAssessmentByKey } from "@/lib/admin/platform-assessment-data";
import { loadPlatformCompletionsByGroup } from "@/lib/admin/platform-assessment-data";
import { isAuthoredPlatformAssessmentKey } from "@/lib/admin/platform-assessments";
import {
  loadAssessmentAvailability,
  loadOrganizationAssessmentReviews,
  loadPlatformAssessmentRelease,
} from "@/lib/assessments/data";
import {
  catalogVisibility,
  isAssessmentCurrentlyReleased,
  organizationMayOfferAssessment,
  reviewForGroup,
} from "@/lib/assessments/reviews";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerPlatformAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ assessmentKey: string }>;
  searchParams: Promise<{ group?: string; error?: string; notice?: string }>;
}) {
  const { assessmentKey } = await params;
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const { t } = await getI18n();
  if (!isAuthoredPlatformAssessmentKey(assessmentKey)) notFound();

  const workspace = await loadManagerWorkspace(user.id);
  if (workspace.groups.length === 0) notFound();

  const assessment = await loadPublishedPlatformAssessmentByKey(assessmentKey);
  if (!assessment) notFound();

  const group =
    workspace.groups.find((row) => row.id === flash.group) ?? workspace.groups[0];
  const groupIds = workspace.groups.map((row) => row.id);
  const [availability, reviews, release, completions] = await Promise.all([
    loadAssessmentAvailability(groupIds),
    loadOrganizationAssessmentReviews(groupIds),
    loadPlatformAssessmentRelease(assessmentKey),
    loadPlatformCompletionsByGroup({
      assessmentId: assessment.id,
      groupIds,
    }),
  ]);
  const review = reviewForGroup(reviews, group.id, assessmentKey);
  const status = catalogVisibility({
    assessmentKey,
    groupId: group.id,
    availability,
    reviewStatus: review?.status ?? null,
  });
  const mayOffer = organizationMayOfferAssessment({
    assessmentKey,
    release,
    reviewStatus: review?.status ?? null,
  });
  const needsReview =
    isAssessmentCurrentlyReleased(release) &&
    (review?.status === "pending" || review?.status === "declined");
  const roster = workspace.participants.filter((row) => row.groupId === group.id);
  const completed = completions.get(group.id) ?? 0;
  const questionCount = assessment.instrument.domains.reduce(
    (sum, domain) => sum + domain.items.length,
    0
  );

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager/assessments" className={interactiveLinkClassName}>
          {t("manager.assessments.title")}
        </Link>
        <span className="text-white/20">|</span>
        <span className="min-w-0 text-foreground">{assessment.title}</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {assessment.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.assessments.platformLead")}
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          {[
            t("manager.assessments.platform"),
            t("manager.assessments.questionMany", { count: questionCount }),
            t("manager.assessments.completedOfRoster", {
              completed,
              total: roster.length,
            }),
            workspace.groups.length > 1 ? group.name : null,
            review?.status === "pending"
              ? t("manager.reviews.pending")
              : review?.status === "declined"
                ? t("manager.reviews.declined")
                : status === "hidden"
                  ? t("manager.assessments.hidden")
                  : t("manager.assessments.available"),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {review && needsReview ? (
          <div className="mt-4">
            <ReviewStatusBadge status={review.status} />
          </div>
        ) : null}
        <div className="mt-5">
          {needsReview && review ? (
            <AssessmentReviewForms
              assessmentKey={assessmentKey}
              groupId={group.id}
              status={review.status}
              declineReason={review.decline_reason}
            />
          ) : mayOffer ? (
            <AssessmentVisibilityForms
              assessmentKey={assessmentKey}
              groupId={group.id}
              status={status}
              kind="platform"
              returnTo="detail"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("manager.assessmentReviews.notReleased")}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">{t("manager.assessments.assignments")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.assessments.platformRosterLead")}
        </p>
        {roster.length === 0 ? (
          <EmptyState
            framed={false}
            className="mt-4 p-0"
            title={t("manager.participants.emptyTitle")}
            actionHref="/manager"
            actionLabel={t("manager.participants.openDashboard")}
          >
            {t("manager.participants.emptyBody")}
          </EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {roster.map((row) => (
              <li key={row.fatherId}>
                <Link
                  href={`/manager/participants/${row.fatherId}`}
                  className={cn(
                    "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
                    interactiveSurfaceClassName
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{row.name}</p>
                  </div>
                  <span
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "pointer-events-none w-full sm:w-auto"
                    )}
                  >
                    {t("manager.assessments.viewParticipant")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
