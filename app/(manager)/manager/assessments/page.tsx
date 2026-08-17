import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadManagerAssessments } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/manager/types";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const assessments = await loadManagerAssessments(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Assessments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your own questions and assign them to fathers in your group.
          </p>
        </div>
        <Link href="/manager/assessments/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
          New assessment
        </Link>
      </div>
      <Flash error={params.error} notice={params.notice} />

      {assessments.length === 0 ? (
        <EmptyState
          title="No assessments yet"
          actionHref="/manager/assessments/new"
          actionLabel="New assessment"
        >
          Create a set of questions, then assign it to fathers from the detail
          page.
        </EmptyState>
      ) : (
        <ul className="grid gap-4">
          {assessments.map((assessment) => (
            <li key={assessment.id}>
              <Link
                href={`/manager/assessments/${assessment.id}`}
                className={cn(
                  "block rounded-xl border border-border bg-card p-4 sm:p-5",
                  interactiveSurfaceClassName
                )}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="font-heading text-lg font-semibold">{assessment.title}</h2>
                    {assessment.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {assessment.description}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-sm text-muted-foreground">
                    {formatShortDate(assessment.created_at)}
                  </p>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {assessment.questionCount}{" "}
                  {assessment.questionCount === 1 ? "question" : "questions"}
                  {" · "}
                  {assessment.completedCount}/{assessment.assignedCount} completed
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
