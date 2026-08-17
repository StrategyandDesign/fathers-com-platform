import { Button } from "@/components/ui/button";
import {
  acceptTrainingRelease,
  declineTrainingRelease,
} from "@/lib/manager/review-actions";
import {
  DECLINE_REASON_MAX,
  REVERSE_ACCEPT_CONFIRM,
  REVIEW_STATUS_LABEL,
  type ReviewStatus,
} from "@/lib/manager/reviews";
import { fieldClassName, textareaClassName } from "@/lib/ui";

export function ReviewDecisionForms({
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
  return (
    <div className="space-y-4">
      {status === "pending" ? (
        <form action={acceptTrainingRelease}>
          <input type="hidden" name="training_id" value={trainingId} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value={returnTo} />
          <Button type="submit" className="w-full sm:w-auto">
            Accept & Push to My Cohort
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            Makes it available to assign. Fathers are not enrolled until you
            choose who receives it.
          </p>
        </form>
      ) : null}

      {status === "declined" ? (
        <form action={acceptTrainingRelease} className="space-y-4">
          <input type="hidden" name="training_id" value={trainingId} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value={returnTo} />
          <p className="text-sm text-muted-foreground">
            Hidden from assignment for your organization. Accepting makes it
            available to assign. Fathers are not enrolled until you choose who
            receives it.
          </p>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">
              Type{" "}
              <span className="font-medium text-foreground">{REVERSE_ACCEPT_CONFIRM}</span>{" "}
              to confirm
            </span>
            <input
              className={fieldClassName}
              name="confirm"
              autoComplete="off"
              required
            />
          </label>
          <Button type="submit" className="w-full sm:w-auto">
            Accept & Push to My Cohort
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
              Decline reason (optional)
            </span>
            <textarea
              className={textareaClassName}
              name="decline_reason"
              maxLength={DECLINE_REASON_MAX}
              defaultValue={declineReason ?? ""}
              placeholder="Optional note for your records"
            />
          </label>
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            Decline
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const label = REVIEW_STATUS_LABEL[status];
  const className =
    status === "accepted"
      ? "text-primary"
      : status === "declined"
        ? "text-destructive"
        : "text-muted-foreground";

  return <span className={`text-sm font-medium ${className}`}>{label}</span>;
}
