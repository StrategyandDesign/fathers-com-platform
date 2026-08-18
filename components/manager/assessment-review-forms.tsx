import { getI18n } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import {
  acceptAssessmentRelease,
  declineAssessmentRelease,
} from "@/lib/assessments/review-actions";
import {
  ASSESSMENT_DECLINE_REASON_MAX,
  ASSESSMENT_REVERSE_ACCEPT_CONFIRM,
  type AssessmentReviewStatus,
} from "@/lib/assessments/reviews";
import { fieldClassName, textareaClassName } from "@/lib/ui";

export async function AssessmentReviewForms({
  assessmentKey,
  groupId,
  status,
  returnTo = "detail",
  declineReason,
}: {
  assessmentKey: string;
  groupId: string;
  status: AssessmentReviewStatus;
  returnTo?: "detail" | "list" | "assessments";
  declineReason?: string | null;
}) {
  const { t } = await getI18n();
  return (
    <div className="space-y-4">
      {status === "pending" ? (
        <form action={acceptAssessmentRelease}>
          <input type="hidden" name="assessment_key" value={assessmentKey} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value={returnTo} />
          <Button type="submit" className="w-full sm:w-auto">
            {t("manager.assessmentReviews.accept")}
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("manager.assessmentReviews.acceptLead")}
          </p>
        </form>
      ) : null}

      {status === "declined" ? (
        <form action={acceptAssessmentRelease} className="space-y-4">
          <input type="hidden" name="assessment_key" value={assessmentKey} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value={returnTo} />
          <p className="text-sm text-muted-foreground">
            {t("manager.assessmentReviews.declinedLead")}
          </p>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">
              {t("manager.reviews.typeConfirm", { word: ASSESSMENT_REVERSE_ACCEPT_CONFIRM })}
            </span>
            <input
              className={fieldClassName}
              name="confirm"
              autoComplete="off"
              required
            />
          </label>
          <Button type="submit" className="w-full sm:w-auto">
            {t("manager.assessmentReviews.accept")}
          </Button>
        </form>
      ) : null}

      {status !== "declined" ? (
        <form action={declineAssessmentRelease} className="space-y-3">
          <input type="hidden" name="assessment_key" value={assessmentKey} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value={returnTo} />
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">
              {status === "accepted"
                ? t("manager.assessmentReviews.removeReason")
                : t("manager.assessmentReviews.declineReason")}
            </span>
            <textarea
              className={textareaClassName}
              name="decline_reason"
              maxLength={ASSESSMENT_DECLINE_REASON_MAX}
              defaultValue={declineReason ?? ""}
              placeholder={t("manager.reviews.declinePlaceholder")}
            />
          </label>
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            {status === "accepted"
              ? t("manager.assessmentReviews.remove")
              : t("manager.assessmentReviews.decline")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
