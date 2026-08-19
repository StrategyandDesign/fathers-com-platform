import { Button } from "@/components/ui/button";
import {
  acceptTrainingRelease,
  declineTrainingRelease,
} from "@/lib/manager/review-actions";
import type { ManagerCatalogStatus } from "@/lib/manager/catalog";
import type { Translate } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

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

  const included = status === "ready" || status === "catalog";
  const declined = status === "declined";

  return (
    <>
      {included ? (
        <Button type="button" disabled className="min-h-11 disabled:opacity-100">
          {t("manager.trainings.included")}
        </Button>
      ) : (
        <form action={acceptTrainingRelease}>
          <input type="hidden" name="training_id" value={trainingId} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value="trainings" />
          {status === "declined" ? <input type="hidden" name="quick" value="1" /> : null}
          <Button type="submit" variant="outline" className="min-h-11">
            {t("manager.trainings.include")}
          </Button>
        </form>
      )}
      {declined ? (
        <Button
          type="button"
          disabled
          className={cn(
            "min-h-11 bg-destructive text-white hover:bg-destructive disabled:opacity-100"
          )}
        >
          {t("manager.trainings.declined")}
        </Button>
      ) : (
        <form action={declineTrainingRelease}>
          <input type="hidden" name="training_id" value={trainingId} />
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="return_to" value="trainings" />
          <Button type="submit" variant="outline" className="min-h-11">
            {t("manager.trainings.decline")}
          </Button>
        </form>
      )}
    </>
  );
}
