import Link from "next/link";

import { AssignedAssessmentList } from "@/components/assessments/assigned-list";
import { buttonVariants } from "@/components/ui/button";
import { firstPartyTakePath } from "@/lib/assessments/first-party";
import type { FatherFirstPartyCard } from "@/lib/assessments/first-party-data";
import type { FatherAssignmentCard } from "@/lib/assessments/types";
import type { Translate } from "@/lib/i18n/translate";
import { getI18n } from "@/lib/i18n/server";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export function FirstPartyAssessmentLink({
  item,
  t,
}: {
  item: FatherFirstPartyCard;
  t: Translate;
}) {
  const completed = Boolean(item.attempt?.completedAt);
  const inProgress = Boolean(item.attempt && !item.attempt.completedAt);
  const href = firstPartyTakePath(item.key);
  const status = completed
    ? t("father.assessments.completed")
    : inProgress
      ? t("father.assessments.inProgress")
      : t("father.assessments.notStarted");
  const action = completed
    ? t("father.assessments.view")
    : inProgress
      ? t("father.assessments.continue")
      : t("father.assessments.take");

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        interactiveSurfaceClassName
      )}
    >
      <div className="min-w-0">
        <p className="font-medium">{item.title}</p>
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
      <span className={cn(buttonVariants(), "pointer-events-none w-full sm:w-auto")}>
        {action}
      </span>
    </Link>
  );
}

export async function FutureAssessmentsPanel({
  assignments,
  firstParty = [],
}: {
  assignments: FatherAssignmentCard[];
  firstParty?: FatherFirstPartyCard[];
}) {
  const { t } = await getI18n();
  const openFirstParty = firstParty.filter((item) => !item.attempt?.completedAt);
  const openAssignments = assignments.filter((item) => item.assignment.status !== "completed");
  const empty = openAssignments.length === 0 && openFirstParty.length === 0;

  return (
    <section className="rounded-xl border border-dashed border-border bg-card/40 p-4 sm:p-5">
      <p className={eyebrowClassName}>{t("father.assessments.futureTitle")}</p>
      {empty ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("father.assessments.futureBody")}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {openFirstParty.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {openFirstParty.map((item) => (
                <li key={item.key}>
                  <FirstPartyAssessmentLink item={item} t={t} />
                </li>
              ))}
            </ul>
          ) : null}
          <AssignedAssessmentList assignments={openAssignments} hideHeader framed={false} quiet />
        </div>
      )}
    </section>
  );
}
