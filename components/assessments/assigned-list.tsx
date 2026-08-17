import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentActionLabel,
  takeHref,
  type FatherAssignmentCard,
} from "@/lib/assessments/types";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function AssignedAssessmentList({
  assignments,
  title = "Assigned assessments",
  quiet = false,
}: {
  assignments: FatherAssignmentCard[];
  title?: string;
  quiet?: boolean;
}) {
  if (assignments.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2
        className={
          quiet
            ? "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]"
            : "font-heading text-lg font-semibold"
        }
      >
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {quiet
          ? "From your manager. Separate from your Profile."
          : "Assessments from your manager. Separate from your Father Profile."}
      </p>
      <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
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
                  {ASSIGNMENT_STATUS_LABEL[assignment.status]}
                  {questionCount > 0
                    ? ` · ${answeredCount}/${questionCount} answered`
                    : ""}
                </p>
              </div>
              <span
                className={cn(
                  buttonVariants({ variant: quiet ? "outline" : "default" }),
                  "pointer-events-none w-full sm:w-auto"
                )}
              >
                {assignmentActionLabel(assignment.status)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
