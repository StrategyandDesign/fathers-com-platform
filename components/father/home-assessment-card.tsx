import Link from "next/link";

import { AssessmentPhotoPlate } from "@/components/assessments/photo-plate";
import { buttonVariants } from "@/components/ui/button";
import { platformTakeHref } from "@/lib/admin/platform-assessments";
import { takeHref, type FatherAssignmentCard } from "@/lib/assessments/types";
import { firstUnanswered } from "@/lib/father/questions";
import type { HomeAssessment } from "@/lib/father/home";
import type { Translate } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export function HomeAssessmentCard({
  assessment,
  coverSrc,
  t,
  className,
}: {
  assessment: HomeAssessment;
  coverSrc: string;
  t: Translate;
  className?: string;
}) {
  const { href, title, detail, action } = copyFor(assessment, t);

  return (
    <section className={cn("flex h-full min-w-0 flex-col gap-3", className)}>
      <p className={eyebrowClassName}>{t("father.home.assessment")}</p>
      <AssessmentPhotoPlate
        src={coverSrc}
        completed={
          assessment.kind === "keystone-result" ||
          assessment.kind === "custom" ||
          (assessment.kind === "platform" && assessment.card.attempt?.status === "completed")
        }
        className="flex min-h-56 flex-1 flex-col sm:min-h-64"
      >
        <div className="flex h-full flex-1 flex-col p-4 sm:p-5">
          <p className="text-[11px] font-medium tracking-[0.12em] text-white/65 uppercase">
            {assessment.kind === "keystone-draft" || assessment.kind === "keystone-result"
              ? t("father.profile.keystone")
              : title}
          </p>
          {detail ? <p className="mt-3 text-sm text-white/80">{detail}</p> : null}
          {assessment.kind === "custom" || assessment.kind === "platform" ? (
            <p className="mt-2 text-sm text-white/65">{title}</p>
          ) : null}
          <div className="mt-auto pt-5">
            <Link
              href={href}
              className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-11")}
            >
              {action}
            </Link>
          </div>
        </div>
      </AssessmentPhotoPlate>
    </section>
  );
}

function copyFor(assessment: HomeAssessment, t: Translate) {
  if (assessment.kind === "custom") {
    return customCopy(assessment.card, t);
  }
  if (assessment.kind === "platform") {
    const status = assessment.card.attempt?.status ?? "not_started";
    return {
      href: platformTakeHref(assessment.card.assessmentKey),
      title: assessment.card.title,
      detail:
        status === "completed"
          ? t("father.assessments.completed")
          : status === "in_progress"
            ? t("father.assessments.inProgress")
            : t("father.assessments.notStarted"),
      action:
        status === "completed"
          ? t("father.assessments.view")
          : status === "in_progress"
            ? t("father.assessments.continue")
            : t("father.assessments.take"),
    };
  }
  if (assessment.kind === "keystone-draft") {
    return {
      href: `/father/profile/take?q=${firstUnanswered(assessment.draft.answers)}`,
      title: t("father.profile.keystone"),
      detail: t("father.home.inProgress"),
      action: t("father.home.continueProfile"),
    };
  }
  return {
    href: "/father/profile/results",
    title: t("father.profile.keystone"),
    detail: null,
    action: t("father.home.viewProfile"),
  };
}

function customCopy(card: FatherAssignmentCard, t: Translate) {
  const status = card.assignment.status;
  return {
    href: takeHref(card.assignment.id),
    title: card.assessment.title,
    detail:
      status === "completed"
        ? t("father.assessments.completed")
        : status === "in_progress"
          ? t("father.assessments.inProgress")
          : t("father.assessments.notStarted"),
    action:
      status === "completed"
        ? t("father.assessments.view")
        : status === "in_progress"
          ? t("father.assessments.continue")
          : t("father.assessments.take"),
  };
}
