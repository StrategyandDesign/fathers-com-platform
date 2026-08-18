import Link from "next/link";
import { redirect } from "next/navigation";

import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { isTrainingPublished } from "@/lib/father/types";
import { runBulkAction } from "@/lib/manager/bulk-actions";
import { isTrainingAssignable, reviewForGroup } from "@/lib/manager/reviews";
import {
  confirmToken,
  isBulkAction,
  parseFatherIds,
  planBulkAssign,
  planBulkCertificates,
  planBulkComplete,
} from "@/lib/manager/bulk";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { translateBulkReason } from "@/lib/i18n/flash";
import { getI18n } from "@/lib/i18n/server";
import { fieldClassName, interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerBulkReviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    training_id?: string;
    session_id?: string;
    father_id?: string | string[];
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const { t } = await getI18n();
  const action = params.action?.trim() ?? "";
  const trainingId = params.training_id?.trim() ?? "";
  const sessionId = params.session_id?.trim() || null;
  const fatherIds = parseFatherIds(params.father_id);

  if (!isBulkAction(action) || !trainingId || fatherIds.length === 0) {
    redirect("/manager/participants?error=Select participants and a training first.");
  }

  const workspace = await loadManagerWorkspace(user.id);
  const training = workspace.trainings.find((row) => row.id === trainingId);
  if (!training) {
    redirect("/manager/participants?error=That training is not in the catalog.");
  }
  if (action === "assign" && !isTrainingPublished(training)) {
    redirect("/manager/participants?error=That training is not published.");
  }
  if (
    action === "assign" &&
    !workspace.groups.some((group) =>
      isTrainingAssignable(training, reviewForGroup(workspace.reviews, group.id, training.id)?.status)
    )
  ) {
    redirect("/manager/participants?error=Accept this training before assigning it.");
  }

  const session = sessionId
    ? workspace.sessions.find((row) => row.id === sessionId && row.training_id === trainingId) ??
      null
    : null;
  if (sessionId && !session) {
    redirect("/manager/participants?error=That session is not in the selected training.");
  }
  if (action !== "complete" && sessionId) {
    redirect("/manager/participants?error=A session can only be chosen when marking complete.");
  }

  const known = new Map(workspace.participants.map((row) => [row.fatherId, row]));
  const rows = fatherIds.map((fatherId) => {
    const participant = known.get(fatherId);
    if (!participant) {
      return {
        fatherId,
        name: t("manager.bulk.unknown"),
        eligible: false,
        reason: t("manager.bulk.notInGroup"),
      };
    }
    const cards = workspace.trainingProgressFor(fatherId);
    const plan =
      action === "assign"
        ? planBulkAssign(
            cards,
            training,
            reviewForGroup(workspace.reviews, participant.groupId, training.id)?.status
          )
        : action === "complete"
          ? planBulkComplete(cards, training, session)
          : planBulkCertificates(cards, training);
    return {
      fatherId,
      name: participant.name,
      eligible: plan.eligible,
      reason: plan.reason,
    };
  });

  const eligible = rows.filter((row) => row.eligible);
  const skipped = rows.filter((row) => !row.eligible);
  const token = confirmToken(action);
  const target = session
    ? t("manager.bulk.inTraining", { session: session.title, training: training.title })
    : training.title;

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager/participants" className={interactiveLinkClassName}>
          {t("manager.participants.title")}
        </Link>
        <span className="text-white/20">|</span>
        <span>{t("manager.bulk.reviewCrumb")}</span>
      </p>
      <Flash error={params.error} />

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {action === "assign"
            ? t("manager.bulk.assign")
            : action === "complete"
              ? t("manager.bulk.complete")
              : t("manager.bulk.certificates")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {action === "assign"
            ? t("manager.bulk.assignLead", { title: training.title })
            : action === "complete"
              ? t("manager.bulk.completeLead", { target })
              : t("manager.bulk.certLead", { title: training.title })}
        </p>
      </div>

      {eligible.length === 0 ? (
        <EmptyState
          title={t("manager.bulk.noneEligibleTitle")}
          actionHref="/manager/participants"
          actionLabel={t("manager.bulk.backParticipants")}
        >
          {t("manager.bulk.noneEligibleBody")}
        </EmptyState>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-4 sm:px-6">
            <h2 className="font-heading text-lg font-semibold">{t("manager.bulk.willUpdate")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("manager.bulk.selectedOf", { eligible: eligible.length, total: rows.length })}
            </p>
          </div>
          <ul className="divide-y divide-border">
            {eligible.map((row) => (
              <li key={row.fatherId} className="px-4 py-3 sm:px-6">
                {row.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {skipped.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-4 sm:px-6">
            <h2 className="font-heading text-lg font-semibold">{t("manager.bulk.willSkip")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("manager.bulk.skipLead")}
            </p>
          </div>
          <ul className="divide-y divide-border">
            {skipped.map((row) => (
              <li
                key={row.fatherId}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <span>{row.name}</span>
                <span className="text-sm text-muted-foreground">
                  {translateBulkReason(row.reason, t)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {eligible.length > 0 ? (
        <form
          action={runBulkAction}
          className="rounded-xl border border-border bg-card p-4 sm:p-6"
        >
          <input type="hidden" name="action" value={action} />
          <input type="hidden" name="training_id" value={trainingId} />
          {sessionId ? <input type="hidden" name="session_id" value={sessionId} /> : null}
          {fatherIds.map((id) => (
            <input key={id} type="hidden" name="father_id" value={id} />
          ))}
          {token ? (
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">
                {t("manager.bulk.typeConfirm", { word: token })}
              </span>
              <input
                className={fieldClassName}
                name="confirm"
                autoComplete="off"
                required
                aria-invalid={Boolean(params.error) || undefined}
              />
            </label>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("manager.bulk.assignNote")}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              variant={action === "complete" ? "destructive" : "default"}
              className="w-full sm:w-auto"
            >
              {action === "assign"
                ? t("manager.bulk.assignTo", { n: eligible.length })
                : action === "complete"
                  ? t("manager.bulk.markN", { n: eligible.length })
                  : eligible.length === 1
                    ? t("manager.bulk.issueOne")
                    : t("manager.bulk.issueN", { n: eligible.length })}
            </Button>
            <Link
              href="/manager/participants"
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              {t("common.cancel")}
            </Link>
          </div>
        </form>
      ) : null}
    </div>
  );
}
