import { Button } from "@/components/ui/button";
import {
  acceptAssessmentRelease,
  declineAssessmentRelease,
} from "@/lib/assessments/review-actions";
import { removeAssessment, shareAssessment } from "@/lib/assessments/visibility-actions";
import {
  catalogAssessmentCanReview,
  type AssessmentCatalogItem,
} from "@/lib/assessments/catalog";
import type { Translate } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

export function AssessmentCatalogDecisionButtons({
  item,
  t,
}: {
  item: AssessmentCatalogItem;
  t: Translate;
}) {
  if (!item.groupId) return null;

  const included = item.decision === "ready" || item.decision === "catalog";
  const declined = item.decision === "declined";
  const canReview = catalogAssessmentCanReview(item.kind);
  const canShareCustom = item.kind === "custom" && item.status === "hidden";

  return (
    <>
      {included ? (
        <Button type="button" disabled className="min-h-11 disabled:opacity-100">
          {t("manager.assessments.included")}
        </Button>
      ) : canReview ? (
        <form action={acceptAssessmentRelease}>
          <input type="hidden" name="assessment_key" value={item.assessmentKey} />
          <input type="hidden" name="group_id" value={item.groupId} />
          <input type="hidden" name="return_to" value="assessments" />
          {declined ? <input type="hidden" name="quick" value="1" /> : null}
          <Button type="submit" variant="outline" className="min-h-11">
            {t("manager.assessments.include")}
          </Button>
        </form>
      ) : canShareCustom ? (
        <form action={shareAssessment}>
          <input type="hidden" name="assessment_key" value={item.assessmentKey} />
          <input type="hidden" name="group_id" value={item.groupId} />
          <input type="hidden" name="return_to" value="list" />
          <Button type="submit" variant="outline" className="min-h-11">
            {t("manager.assessments.include")}
          </Button>
        </form>
      ) : (
        <Button type="button" disabled className="min-h-11 disabled:opacity-100">
          {t("manager.assessments.included")}
        </Button>
      )}
      {canReview ? (
        declined ? (
          <Button
            type="button"
            disabled
            className={cn(
              "min-h-11 bg-destructive text-white hover:bg-destructive disabled:opacity-100"
            )}
          >
            {t("manager.assessments.declined")}
          </Button>
        ) : (
          <form action={declineAssessmentRelease}>
            <input type="hidden" name="assessment_key" value={item.assessmentKey} />
            <input type="hidden" name="group_id" value={item.groupId} />
            <input type="hidden" name="return_to" value="assessments" />
            <Button type="submit" variant="outline" className="min-h-11">
              {t("manager.assessments.decline")}
            </Button>
          </form>
        )
      ) : included && item.kind === "custom" ? (
        <form action={removeAssessment}>
          <input type="hidden" name="assessment_key" value={item.assessmentKey} />
          <input type="hidden" name="group_id" value={item.groupId} />
          <input type="hidden" name="return_to" value="list" />
          <Button type="submit" variant="outline" className="min-h-11">
            {t("manager.assessments.decline")}
          </Button>
        </form>
      ) : null}
    </>
  );
}
