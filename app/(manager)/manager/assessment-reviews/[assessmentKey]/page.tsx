import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentInstrumentReview } from "@/components/manager/assessment-instrument-review";
import { AssessmentReviewForms } from "@/components/manager/assessment-review-forms";
import { Flash } from "@/components/manager/flash";
import { ReviewStatusBadge } from "@/components/manager/review-decision-forms";
import {
  loadOrganizationAssessmentReviews,
  loadPlatformAssessmentRelease,
  markAssessmentNotificationsRead,
} from "@/lib/assessments/data";
import { isFirstPartyAssessmentKey } from "@/lib/assessments/first-party";
import { loadFirstPartyCatalog } from "@/lib/assessments/first-party-data";
import { firstPartyInstrumentReview } from "@/lib/assessments/instrument-review";
import {
  isAssessmentCurrentlyReleased,
  reviewForGroup,
} from "@/lib/assessments/reviews";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { interactiveLinkClassName } from "@/lib/ui";

export default async function ManagerFirstPartyReviewPage({
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
  if (!isFirstPartyAssessmentKey(assessmentKey)) notFound();
  const assessment = await loadFirstPartyCatalog(assessmentKey);
  if (!assessment) notFound();

  const workspace = await loadManagerWorkspace(user.id);
  if (workspace.groups.length === 0) notFound();

  const [reviews, release] = await Promise.all([
    loadOrganizationAssessmentReviews(workspace.groups.map((row) => row.id)),
    loadPlatformAssessmentRelease(assessmentKey),
  ]);

  const group =
    workspace.groups.find((row) => row.id === flash.group) ??
    workspace.groups.find((row) => {
      const review = reviewForGroup(reviews, row.id, assessmentKey);
      return review?.status === "pending";
    }) ??
    workspace.groups[0];

  const review = reviewForGroup(reviews, group.id, assessmentKey);
  if (!review || !isAssessmentCurrentlyReleased(release)) {
    notFound();
  }

  await markAssessmentNotificationsRead(user.id, assessmentKey);

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
          {t("manager.assessmentReviews.lead", { org: group.name })}
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {[
              t("manager.assessments.platform"),
              t("manager.assessments.questionMany", { count: assessment.questionCount }),
              workspace.groups.length > 1 ? group.name : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <ReviewStatusBadge status={review.status} />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{assessment.description}</p>
        <div className="mt-5">
          <AssessmentReviewForms
            assessmentKey={assessmentKey}
            groupId={group.id}
            status={review.status}
            declineReason={review.decline_reason}
          />
        </div>
      </section>

      <AssessmentInstrumentReview model={firstPartyInstrumentReview(assessment)} />
    </div>
  );
}
