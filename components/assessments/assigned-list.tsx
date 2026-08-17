import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { takeHref, type FatherAssignmentCard } from "@/lib/assessments/types";
import { getI18n } from "@/lib/i18n/server";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export async function AssignedAssessmentList({
  assignments,
  title,
  quiet = false,
  hideHeader = false,
}: {
  assignments: FatherAssignmentCard[];
  title?: string;
  quiet?: boolean;
  hideHeader?: boolean;
}) {
  if (assignments.length === 0) return null;
  const { t } = await getI18n();
  const heading = title ?? t("father.assessments.title");

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      {hideHeader ? null : (
        <>
          <h2
            className={
              quiet
                ? "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]"
                : "font-heading text-lg font-semibold"
            }
          >
            {heading}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {quiet ? t("father.assessments.quietLead") : t("father.assessments.lead")}
          </p>
        </>
      )}
      <ul
        className={
          hideHeader
            ? "divide-y divide-border overflow-hidden rounded-lg border border-border"
            : "mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border"
        }
      >
        {assignments.map(({ assignment, assessment, questionCount, answeredCount }) => (
          <li key={assignment.id}>
            <Link
              href={takeHref(assignment.id)}
              className={cn(
                "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
                interactiveSurfaceClassName
              )}
            >
              <div className="min-w-0">
                <p className="font-medium">{assessment.title}</p>
                <p className="text-sm text-muted-foreground">
                  {t(`father.assessments.${assignment.status === "not_started" ? "notStarted" : assignment.status === "in_progress" ? "inProgress" : "completed"}`)}
                  {questionCount > 0
                    ? ` · ${t("father.assessments.answered", {
                        answered: answeredCount,
                        total: questionCount,
                      })}`
                    : ""}
                </p>
              </div>
              <span
                className={cn(
                  buttonVariants({ variant: quiet ? "outline" : "default" }),
                  "pointer-events-none w-full sm:w-auto"
                )}
              >
                {assignment.status === "completed"
                  ? t("father.assessments.view")
                  : assignment.status === "in_progress"
                    ? t("father.assessments.continue")
                    : t("father.assessments.take")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
