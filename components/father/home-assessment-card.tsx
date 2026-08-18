import Link from "next/link";

import { takeHref, type FatherAssignmentCard } from "@/lib/assessments/types";
import { firstUnanswered } from "@/lib/father/questions";
import type { HomeAssessment } from "@/lib/father/home";
import type { Translate } from "@/lib/i18n/translate";
import { interactiveUnderlineClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function HomeAssessmentCard({
  assessment,
  t,
}: {
  assessment: HomeAssessment;
  t: Translate;
}) {
  const { href, title, detail, action } = copyFor(assessment, t);

  return (
    <section className="rounded-xl border border-border bg-card px-4 py-4">
      <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {t("father.home.assessment")}
      </p>
      <p className="font-heading mt-2 text-lg font-semibold leading-snug">{title}</p>
      {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
      <p className="mt-3">
        <Link href={href} className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}>
          {action}
        </Link>
      </p>
    </section>
  );
}

function copyFor(assessment: HomeAssessment, t: Translate) {
  if (assessment.kind === "custom") {
    return customCopy(assessment.card, t);
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
