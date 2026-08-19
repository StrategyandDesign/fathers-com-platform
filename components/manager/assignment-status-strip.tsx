import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Translate } from "@/lib/i18n/translate";
import type { CohortTrainingStatus } from "@/lib/manager/assignment-status";
import { assignTrainingToUnassigned } from "@/lib/manager/training-actions";
import { participationCopyKey, type ParticipationMode } from "@/lib/participation";
import { cn } from "@/lib/utils";

function statusLine(item: CohortTrainingStatus, t: Translate) {
  return [
    t("manager.status.assignedOf", { assigned: item.assigned, total: item.total }),
    t("manager.status.notStartedCount", { n: item.notStarted }),
    t("manager.status.inProgressCount", { n: item.inProgress }),
    t("manager.status.doneCount", { n: item.completed }),
  ].join(" · ");
}

export function AssignmentStatusStrip({
  items,
  emptyHref,
  returnTo,
  mode = "unset",
  t,
}: {
  items: CohortTrainingStatus[];
  emptyHref: string;
  returnTo: "dashboard" | "trainings";
  mode?: ParticipationMode;
  t: Translate;
}) {
  return (
    <section id="status" className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold">{t("manager.status.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(participationCopyKey(mode, "manager.status.lead"))}
          </p>
        </div>
        {items.length > 0 ? (
          <Link
            href="/manager/participants#status"
            className={cn(buttonVariants({ variant: "outline" }), "w-full shrink-0 sm:w-auto")}
          >
            {t("manager.status.openBoard")}
          </Link>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            framed={false}
            className="p-0"
            title={t("manager.status.emptyTitle")}
            actionHref={emptyHref}
            actionLabel={t("manager.status.emptyAction")}
          >
            {t("manager.status.emptyBody")}
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {items.map((item) => (
            <li
              key={item.trainingId}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{statusLine(item, t)}</p>
              </div>
              {item.remaining > 0 ? (
                <form action={assignTrainingToUnassigned} className="shrink-0">
                  <input type="hidden" name="training_id" value={item.trainingId} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <Button type="submit" className="w-full min-h-11 sm:w-auto">
                    {t("manager.trainings.assignRemaining", { n: item.remaining })}
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">{t("manager.trainings.allAssigned")}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
