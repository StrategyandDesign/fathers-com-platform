import { getI18n } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import {
  acceptTrainingRelease,
  declineTrainingRelease,
} from "@/lib/manager/review-actions";
import {
  DECLINE_REASON_MAX,
  REVERSE_ACCEPT_CONFIRM,
  type ReviewStatus,
} from "@/lib/manager/reviews";
import { fieldClassName, textareaClassName } from "@/lib/ui";

export async function ReviewDecisionForms({
  trainingId,
  groupId,
  status,
  returnTo = "detail",
  declineReason,
}: {
  trainingId: string;
  groupId: string;
  status: ReviewStatus;
  returnTo?: "detail" | "queue";
  declineReason?: string | null;
}) {
  const { t } = await getI18n();
  return (
    <div className="space-y-4">
      {status === "pending" ? (
        <form action={acceptTrainingRelease}>
          <input type="hidden" name="training_id" value={trainingId} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value={returnTo} />
          <Button type="submit" className="w-full sm:w-auto">
            {t("manager.reviews.accept")}
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("manager.reviews.acceptLead")}
          </p>
        </form>
      ) : null}

      {status === "declined" ? (
        <form action={acceptTrainingRelease} className="space-y-4">
          <input type="hidden" name="training_id" value={trainingId} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value={returnTo} />
          <p className="text-sm text-muted-foreground">
            {t("manager.reviews.declinedLead")}
          </p>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">
              {t("manager.reviews.typeConfirm", { word: REVERSE_ACCEPT_CONFIRM })}
            </span>
            <input
              className={fieldClassName}
              name="confirm"
              autoComplete="off"
              required
            />
          </label>
          <Button type="submit" className="w-full sm:w-auto">
            {t("manager.reviews.accept")}
          </Button>
        </form>
      ) : null}

      {status !== "declined" ? (
        <form action={declineTrainingRelease} className="space-y-3">
          <input type="hidden" name="training_id" value={trainingId} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value={returnTo} />
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">
              {t("manager.reviews.declineReason")}
            </span>
            <textarea
              className={textareaClassName}
              name="decline_reason"
              maxLength={DECLINE_REASON_MAX}
              defaultValue={declineReason ?? ""}
              placeholder={t("manager.reviews.declinePlaceholder")}
            />
          </label>
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            {t("manager.reviews.decline")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export async function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const { t } = await getI18n();
  const label = t(`manager.reviews.${status}`);
  const className =
    status === "accepted"
      ? "text-primary"
      : status === "declined"
        ? "text-destructive"
        : "text-muted-foreground";

  return <span className={`text-sm font-medium ${className}`}>{label}</span>;
}
