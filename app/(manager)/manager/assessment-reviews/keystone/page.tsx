import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentReviewForms } from "@/components/manager/assessment-review-forms";
import { Flash } from "@/components/manager/flash";
import { ReviewStatusBadge } from "@/components/manager/review-decision-forms";
import { KEYSTONE_ASSESSMENT_KEY } from "@/lib/assessments/availability";
import {
  loadOrganizationAssessmentReviews,
  loadPlatformAssessmentRelease,
  markAssessmentNotificationsRead,
} from "@/lib/assessments/data";
import {
  isAssessmentCurrentlyReleased,
  reviewForGroup,
} from "@/lib/assessments/reviews";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { PROFILE_QUESTION_COUNT } from "@/lib/father/questions";
import { interactiveLinkClassName } from "@/lib/ui";

export default async function ManagerKeystoneReviewPage({
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

  const [reviews, release] = await Promise.all([
    loadOrganizationAssessmentReviews(workspace.groups.map((row) => row.id)),
    loadPlatformAssessmentRelease(KEYSTONE_ASSESSMENT_KEY),
  ]);

  const group =
    workspace.groups.find((row) => row.id === flash.group) ??
    workspace.groups.find((row) => {
      const review = reviewForGroup(reviews, row.id, KEYSTONE_ASSESSMENT_KEY);
      return review?.status === "pending";
    }) ??
    workspace.groups[0];

  const review = reviewForGroup(reviews, group.id, KEYSTONE_ASSESSMENT_KEY);
  if (!review || !isAssessmentCurrentlyReleased(release)) {
    notFound();
  }

  await markAssessmentNotificationsRead(user.id, KEYSTONE_ASSESSMENT_KEY);

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager/assessments" className={interactiveLinkClassName}>
          {t("manager.assessments.title")}
        </Link>
        <span className="text-foreground/20">|</span>
        <span className="min-w-0 text-foreground">{t("father.profile.keystone")}</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("father.profile.keystone")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.assessmentReviews.lead", { org: group.name })}
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {[
              t("manager.assessments.platform"),
              t("manager.assessments.questionMany", { count: PROFILE_QUESTION_COUNT }),
              workspace.groups.length > 1 ? group.name : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <ReviewStatusBadge status={review.status} />
        </div>
        <div className="mt-5">
          <AssessmentReviewForms
            assessmentKey={KEYSTONE_ASSESSMENT_KEY}
            groupId={group.id}
            status={review.status}
            declineReason={review.decline_reason}
          />
        </div>
      </section>
    </div>
  );
}
