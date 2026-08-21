import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentInstrumentReview } from "@/components/manager/assessment-instrument-review";
import { AssessmentReviewForms } from "@/components/manager/assessment-review-forms";
import { AssessmentVisibilityForms } from "@/components/manager/assessment-visibility-forms";
import { Flash } from "@/components/manager/flash";
import { ReviewStatusBadge } from "@/components/manager/review-decision-forms";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { KEYSTONE_ASSESSMENT_KEY } from "@/lib/assessments/availability";
import {
  loadAssessmentAvailability,
  loadOrganizationAssessmentReviews,
  loadPlatformAssessmentRelease,
} from "@/lib/assessments/data";
import {
  catalogVisibility,
  isAssessmentCurrentlyReleased,
  isLegacyCatalogAssessment,
  organizationMayOfferAssessment,
  reviewForGroup,
} from "@/lib/assessments/reviews";
import { requireRole } from "@/lib/auth/session";
import { translateAssignmentStatus } from "@/lib/i18n/flash";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { keystoneInstrumentReview } from "@/lib/assessments/instrument-review";
import { PROFILE_QUESTION_COUNT } from "@/lib/father/questions";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerKeystonePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const { t } = await getI18n();
  const workspace = await loadManagerWorkspace(user.id);
  if (workspace.groups.length === 0) {
    notFound();
  }

  const group =
    workspace.groups.find((row) => row.id === flash.group) ?? workspace.groups[0];
  const groupIds = workspace.groups.map((row) => row.id);
  const [availability, reviews, release] = await Promise.all([
    loadAssessmentAvailability(groupIds),
    loadOrganizationAssessmentReviews(groupIds),
    loadPlatformAssessmentRelease(KEYSTONE_ASSESSMENT_KEY),
  ]);
  const review = reviewForGroup(reviews, group.id, KEYSTONE_ASSESSMENT_KEY);
  const status = catalogVisibility({
    assessmentKey: KEYSTONE_ASSESSMENT_KEY,
    groupId: group.id,
    availability,
    reviewStatus: review?.status ?? null,
  });
  const mayOffer = organizationMayOfferAssessment({
    assessmentKey: KEYSTONE_ASSESSMENT_KEY,
    release,
    reviewStatus: review?.status ?? null,
  });
  const needsReview =
    isAssessmentCurrentlyReleased(release) &&
    (review?.status === "pending" || review?.status === "declined");
  const inOpenCatalog = isLegacyCatalogAssessment(release);
  const roster = workspace.participants.filter((row) => row.groupId === group.id);
  const completed = roster.filter((row) => row.profileStatus === "completed").length;

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager/assessments" className={interactiveLinkClassName}>
          {t("manager.assessments.title")}
        </Link>
        <span className="text-white/20">|</span>
        <span className="min-w-0 text-foreground">{t("father.profile.keystone")}</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("father.profile.keystone")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.assessments.keystoneLead")}
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          {[
            t("manager.assessments.platform"),
            t("manager.assessments.questionMany", { count: PROFILE_QUESTION_COUNT }),
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
        {review && (needsReview || !inOpenCatalog) ? (
          <div className="mt-4">
            <ReviewStatusBadge status={review.status} />
          </div>
        ) : null}
        <div className="mt-5">
          {needsReview && review ? (
            <AssessmentReviewForms
              assessmentKey={KEYSTONE_ASSESSMENT_KEY}
              groupId={group.id}
              status={review.status}
              declineReason={review.decline_reason}
            />
          ) : mayOffer ? (
            <AssessmentVisibilityForms
              assessmentKey={KEYSTONE_ASSESSMENT_KEY}
              groupId={group.id}
              status={status}
              kind="keystone"
              returnTo="detail"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("manager.assessmentReviews.notReleased")}
            </p>
          )}
        </div>
      </section>

      <AssessmentInstrumentReview model={keystoneInstrumentReview()} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">{t("manager.assessments.assignments")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.assessments.keystoneRosterLead")}
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
                    <p className="text-sm text-muted-foreground">
                      {translateAssignmentStatus(row.profileStatus, t)}
                    </p>
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
