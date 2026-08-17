import { Button } from "@/components/ui/button";
import { updateTrainingRequestStatus } from "@/lib/training-requests/actions";
import {
  TRAINING_REQUEST_STATUSES,
  TRAINING_REQUEST_STATUS_LABEL,
  type TrainingRequestStatus,
} from "@/lib/training-requests/types";

export function TrainingRequestStatusForms({
  requestId,
  status,
}: {
  requestId: string;
  status: TrainingRequestStatus;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {TRAINING_REQUEST_STATUSES.filter((next) => next !== status).map((next) => (
        <form key={next} action={updateTrainingRequestStatus}>
          <input type="hidden" name="request_id" value={requestId} />
          <input type="hidden" name="status" value={next} />
          <Button
            type="submit"
            variant={next === "planned" ? "default" : "outline"}
            className="w-full sm:w-auto"
          >
            {TRAINING_REQUEST_STATUS_LABEL[next]}
          </Button>
        </form>
      ))}
    </div>
  );
}
