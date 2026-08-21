import Link from "next/link";

import { AssessmentCatalogDecisionButtons } from "@/components/manager/assessment-catalog-decision-buttons";
import { CatalogScrollList } from "@/components/manager/catalog-scroll-list";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { assignAssessmentToUnassigned } from "@/lib/assessments/actions";
import type { AssessmentCatalogItem } from "@/lib/assessments/catalog";
import type { Translate } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

export function assessmentCatalogTitle(item: AssessmentCatalogItem, t: Translate) {
  return item.kind === "keystone" ? t("father.profile.keystone") : item.title ?? "";
}

export function assessmentQuestionLabel(count: number, t: Translate) {
  return count === 1
    ? t("manager.assessments.questionOne")
    : t("manager.assessments.questionMany", { count });
}

export function AssessmentCatalogRow({
  item,
  t,
  remaining = 0,
}: {
  item: AssessmentCatalogItem;
  t: Translate;
  remaining?: number;
}) {
  const title = assessmentCatalogTitle(item, t);

  return (
    <>
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {[
            item.kind === "custom" ? null : t("manager.assessments.platform"),
            assessmentQuestionLabel(item.questionCount, t),
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
            item.decision === "declined"
              ? t("manager.assessments.declined")
              : item.status === "hidden"
                ? t("manager.assessments.hidden")
                : item.decision === "pending"
                  ? t("manager.assessments.catalogPending")
                  : t("manager.assessments.included"),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {item.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        ) : null}
      </div>
      <div className="mt-4 flex flex-row flex-wrap items-center gap-2">
        <AssessmentCatalogDecisionButtons item={item} t={t} />
        <Link href={item.href} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>
          {t("manager.assessments.viewAssessment")}
        </Link>
        {item.kind === "custom" && item.customId && item.status === "available" && remaining > 0 ? (
          <form action={assignAssessmentToUnassigned}>
            <input type="hidden" name="assessment_id" value={item.customId} />
            <input type="hidden" name="group_id" value={item.groupId} />
            <Button type="submit" className="min-h-11">
              {t("manager.assessments.assignRemaining", { n: remaining })}
            </Button>
          </form>
        ) : null}
      </div>
    </>
  );
}

export function AssessmentCatalog({
  items,
  remainingFor,
  t,
}: {
  items: AssessmentCatalogItem[];
  remainingFor: (item: AssessmentCatalogItem) => number;
  t: Translate;
}) {
  return (
    <section id="catalog" className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">{t("manager.assessments.catalogTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("manager.assessments.catalogLead")}</p>
      </div>
      {items.length === 0 ? (
        <EmptyState title={t("manager.assessments.catalogEmptyTitle")}>
          {t("manager.assessments.catalogEmptyBody")}
        </EmptyState>
      ) : (
        <CatalogScrollList count={items.length} label={t("manager.assessments.catalogTitle")}>
          {items.map((item) => (
            <li key={item.key} className="px-4 py-5 sm:px-6">
              <AssessmentCatalogRow item={item} remaining={remainingFor(item)} t={t} />
            </li>
          ))}
        </CatalogScrollList>
      )}
    </section>
  );
}
