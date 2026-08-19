import { AssignedAssessmentList } from "@/components/assessments/assigned-list";
import type { FatherAssignmentCard } from "@/lib/assessments/types";
import { getI18n } from "@/lib/i18n/server";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export async function FutureAssessmentsPanel({
  assignments,
}: {
  assignments: FatherAssignmentCard[];
}) {
  const { t } = await getI18n();

  return (
    <section className="rounded-xl border border-dashed border-border bg-card/40 p-4 sm:p-5">
      <p className={eyebrowClassName}>{t("father.assessments.futureTitle")}</p>
      {assignments.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("father.assessments.futureBody")}
        </p>
      ) : (
        <div className="mt-3">
          <AssignedAssessmentList assignments={assignments} hideHeader framed={false} quiet />
        </div>
      )}
    </section>
  );
}
