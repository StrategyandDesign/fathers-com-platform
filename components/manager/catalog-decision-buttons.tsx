import { Button } from "@/components/ui/button";
import {
  acceptTrainingRelease,
  declineTrainingRelease,
} from "@/lib/manager/review-actions";
import type { ManagerCatalogStatus } from "@/lib/manager/catalog";
import type { Translate } from "@/lib/i18n/translate";

export function CatalogDecisionButtons({
  trainingId,
  groupId,
  status,
  t,
}: {
  trainingId: string;
  groupId?: string;
  status: ManagerCatalogStatus;
  t: Translate;
}) {
  if (!groupId) return null;
  const canInclude = status === "pending" || status === "declined";
  const canDecline = status === "pending" || status === "ready" || status === "catalog";
  if (!canInclude && !canDecline) return null;

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      {canInclude ? (
        <form action={acceptTrainingRelease}>
          <input type="hidden" name="training_id" value={trainingId} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value="trainings" />
          {status === "declined" ? <input type="hidden" name="quick" value="1" /> : null}
          <Button type="submit" className="w-full min-h-11 sm:w-auto">
            {t("manager.trainings.include")}
          </Button>
        </form>
      ) : null}
      {canDecline ? (
        <form action={declineTrainingRelease}>
          <input type="hidden" name="training_id" value={trainingId} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value="trainings" />
          <Button type="submit" variant="outline" className="w-full min-h-11 sm:w-auto">
            {t("manager.trainings.decline")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
