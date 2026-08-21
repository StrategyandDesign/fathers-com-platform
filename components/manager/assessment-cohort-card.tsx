import Link from "next/link";

import {
  assessmentCatalogTitle,
  assessmentQuestionLabel,
} from "@/components/manager/assessment-catalog";
import { AssessmentReviewForms } from "@/components/manager/assessment-review-forms";
import { Button, buttonVariants } from "@/components/ui/button";
import { assignAssessmentToUnassigned } from "@/lib/assessments/actions";
import { removeAssessment, shareAssessment } from "@/lib/assessments/visibility-actions";
import type { AssessmentCatalogItem } from "@/lib/assessments/catalog";
import type { Translate } from "@/lib/i18n/translate";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type AssessmentCohortStats = {
  assigned: number;
  total: number;
  remaining: number;
  notStarted: number;
  inProgress: number;
  completed: number;
};

export function AssessmentCohortCard({
  item,
  stats,
  includedOn,
  t,
}: {
  item: AssessmentCatalogItem;
  stats: AssessmentCohortStats;
  includedOn?: string | null;
  t: Translate;
}) {
  const title = assessmentCatalogTitle(item, t);
  const chooseHref =
    item.kind === "custom" && item.customId
      ? `/manager/assessments/${item.customId}#assign`
      : `${item.href.replace(/#.*$/, "")}#assign`;

  return (
    <li className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href={item.href} className={cn("block font-medium", interactiveLinkClassName)}>
            {title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              assessmentQuestionLabel(item.questionCount, t),
              t("manager.assessments.assignedOf", {
                assigned: stats.assigned,
                total: stats.total,
              }),
              t("manager.status.notStartedCount", { n: stats.notStarted }),
              t("manager.status.inProgressCount", { n: stats.inProgress }),
              t("manager.status.doneCount", { n: stats.completed }),
              includedOn ? t("manager.assessments.includedOn", { date: includedOn }) : null,
              item.groupName,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className="text-sm font-medium text-primary">{t("manager.assessments.included")}</span>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={item.href}
          className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-11 sm:w-auto")}
        >
          {t("manager.assessments.viewAssessment")}
        </Link>
        {item.kind === "custom" && item.customId && stats.remaining > 0 ? (
          <form action={assignAssessmentToUnassigned}>
            <input type="hidden" name="assessment_id" value={item.customId} />
            <input type="hidden" name="group_id" value={item.groupId} />
            <Button type="submit" className="w-full min-h-11 sm:w-auto">
              {t("manager.assessments.assignRemaining", { n: stats.remaining })}
            </Button>
          </form>
        ) : null}
        {item.kind !== "custom" && item.status === "hidden" && stats.total > 0 ? (
          <form action={shareAssessment}>
            <input type="hidden" name="assessment_key" value={item.assessmentKey} />
            <input type="hidden" name="group_id" value={item.groupId} />
            <input type="hidden" name="return_to" value="list" />
            <Button type="submit" className="w-full min-h-11 sm:w-auto">
              {t("manager.assessments.assignRemaining", { n: stats.total })}
            </Button>
          </form>
        ) : null}
        <Link
          href={chooseHref}
          className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-11 sm:w-auto")}
        >
          {t("manager.assessments.chooseFathers")}
        </Link>
      </div>
      <div className="mt-5 border-t border-border pt-5">
        <p className="mb-3 text-sm text-muted-foreground">{t("manager.assessments.removeLead")}</p>
        {item.kind === "custom" ? (
          <form action={removeAssessment}>
            <input type="hidden" name="assessment_key" value={item.assessmentKey} />
            <input type="hidden" name="group_id" value={item.groupId} />
            <input type="hidden" name="return_to" value="list" />
            <Button type="submit" variant="outline" className="w-full min-h-11 sm:w-auto">
              {t("manager.assessments.removeFromCohort")}
            </Button>
          </form>
        ) : item.groupId ? (
          <AssessmentReviewForms
            assessmentKey={item.assessmentKey}
            groupId={item.groupId}
            status="accepted"
            returnTo="assessments"
          />
        ) : null}
      </div>
    </li>
  );
}
