import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Translate } from "@/lib/i18n/translate";
import type {
  AssignmentBoard as AssignmentBoardModel,
  AssignmentBoardCell,
  AssignmentCellStatus,
} from "@/lib/manager/assignment-status";
import { assignTraining } from "@/lib/manager/actions";
import { assignTrainingToUnassigned } from "@/lib/manager/training-actions";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function cellLabel(cell: AssignmentBoardCell, t: Translate) {
  if (cell.status === "completed") return t("manager.status.done");
  if (cell.status === "in_progress") {
    return t("manager.status.sessionsShort", {
      completed: cell.completed,
      total: cell.total,
    });
  }
  if (cell.status === "not_started") return t("manager.status.notStarted");
  return t("common.emDash");
}

function cellTone(status: AssignmentCellStatus) {
  if (status === "completed") return "text-foreground";
  if (status === "in_progress") return "text-foreground";
  return "text-muted-foreground";
}

function AssignCellButton({
  fatherId,
  trainingId,
  label,
}: {
  fatherId: string;
  trainingId: string;
  label: string;
}) {
  return (
    <form action={assignTraining}>
      <input type="hidden" name="father_id" value={fatherId} />
      <input type="hidden" name="training_id" value={trainingId} />
      <input type="hidden" name="return_to" value="participants" />
      <Button type="submit" size="sm" className="w-full min-h-11 sm:min-h-9">
        {label}
      </Button>
    </form>
  );
}

export function AssignmentBoard({
  board,
  showGroupName,
  highlightTrainingId,
  t,
}: {
  board: AssignmentBoardModel;
  showGroupName: boolean;
  highlightTrainingId?: string;
  t: Translate;
}) {
  if (board.columns.length === 0) {
    return (
      <section id="status" className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("manager.status.boardTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("manager.status.boardLead")}</p>
        </div>
        <EmptyState
          title={t("manager.status.emptyTitle")}
          actionHref="/manager/trainings#catalog"
          actionLabel={t("manager.status.emptyAction")}
        >
          {t("manager.status.emptyBody")}
        </EmptyState>
      </section>
    );
  }

  return (
    <section id="status" className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">{t("manager.status.boardTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("manager.status.boardLead")}</p>
      </div>

      <div className="space-y-3 md:hidden">
        {board.columns.some((column) => column.remaining > 0) ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{t("manager.status.assignRemainingLead")}</p>
            <ul className="mt-3 space-y-2">
              {board.columns
                .filter((column) => column.remaining > 0)
                .map((column) => (
                  <li key={column.trainingId}>
                    <form action={assignTrainingToUnassigned}>
                      <input type="hidden" name="training_id" value={column.trainingId} />
                      <input type="hidden" name="return_to" value="participants" />
                      <Button type="submit" className="w-full min-h-11">
                        {`${column.title} · ${t("manager.trainings.assignRemaining", { n: column.remaining })}`}
                      </Button>
                    </form>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
        {board.rows.map((row) => (
          <article key={row.fatherId} className="rounded-xl border border-border bg-card p-4">
            <Link
              href={`/manager/participants/${row.fatherId}`}
              className={cn("block font-medium", interactiveLinkClassName)}
            >
              {row.name}
            </Link>
            {showGroupName ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{row.groupName}</p>
            ) : null}
            <ul className="mt-4 space-y-3">
              {row.cells.map((cell, index) => {
                const column = board.columns[index];
                if (!column) return null;
                return (
                  <li
                    key={cell.trainingId}
                    className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{column.title}</p>
                      {cell.canAssign ? null : (
                        <p className={cn("text-sm", cellTone(cell.status))}>{cellLabel(cell, t)}</p>
                      )}
                    </div>
                    {cell.canAssign ? (
                      <AssignCellButton
                        fatherId={row.fatherId}
                        trainingId={cell.trainingId}
                        label={t("manager.status.assign")}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-5 py-3 font-medium">{t("manager.bulk.name")}</th>
                {board.columns.map((column) => (
                  <th
                    key={column.trainingId}
                    className={cn(
                      "px-4 py-3 font-medium",
                      highlightTrainingId === column.trainingId && "text-foreground"
                    )}
                  >
                    <span className="block normal-case tracking-normal text-foreground">
                      {column.title}
                    </span>
                    {column.remaining > 0 ? (
                      <form action={assignTrainingToUnassigned} className="mt-2">
                        <input type="hidden" name="training_id" value={column.trainingId} />
                        <input type="hidden" name="return_to" value="participants" />
                        <Button type="submit" size="sm" variant="outline">
                          {t("manager.trainings.assignRemaining", { n: column.remaining })}
                        </Button>
                      </form>
                    ) : (
                      <span className="mt-2 block text-[11px] font-normal tracking-wide text-muted-foreground uppercase">
                        {t("manager.status.allHaveIt")}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.rows.map((row) => (
                <tr key={row.fatherId} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <Link
                      href={`/manager/participants/${row.fatherId}`}
                      className={cn("font-medium", interactiveLinkClassName)}
                    >
                      {row.name}
                    </Link>
                    {showGroupName ? (
                      <p className="text-muted-foreground">{row.groupName}</p>
                    ) : null}
                  </td>
                  {row.cells.map((cell) => (
                    <td
                      key={cell.trainingId}
                      className={cn(
                        "px-4 py-3 align-middle",
                        highlightTrainingId === cell.trainingId && "bg-white/5"
                      )}
                    >
                      {cell.canAssign ? (
                        <AssignCellButton
                          fatherId={row.fatherId}
                          trainingId={cell.trainingId}
                          label={t("manager.status.assign")}
                        />
                      ) : (
                        <span className={cellTone(cell.status)}>{cellLabel(cell, t)}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
