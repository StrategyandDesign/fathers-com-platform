import Link from "next/link";
import { notFound } from "next/navigation";

import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { assignAssessment, updateAssessment } from "@/lib/assessments/actions";
import { loadManagerAssessmentDetail } from "@/lib/assessments/data";
import { ASSIGNMENT_STATUS_LABEL } from "@/lib/assessments/types";
import { requireRole } from "@/lib/auth/session";
import { fieldClassName, interactiveLinkClassName, interactiveSurfaceClassName, textareaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerAssessmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const detail = await loadManagerAssessmentDetail(user.id, id);

  if (!detail) {
    notFound();
  }

  const assignedIds = new Set(detail.assignments.map((row) => row.father_id));
  const unassigned = detail.roster.filter((row) => !assignedIds.has(row.fatherId));

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager/assessments" className={interactiveLinkClassName}>
          Assessments
        </Link>
        <span className="text-white/20">|</span>
        <span className="min-w-0 text-foreground">{detail.assessment.title}</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {detail.assessment.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit details, assign fathers, and review responses.
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <form
        action={updateAssessment}
        className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <input type="hidden" name="assessment_id" value={detail.assessment.id} />
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Title</span>
          <input
            className={fieldClassName}
            name="title"
            defaultValue={detail.assessment.title}
            required
            maxLength={200}
            aria-invalid={Boolean(flash.error) || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Description</span>
          <textarea
            className={textareaClassName}
            name="description"
            defaultValue={detail.assessment.description ?? ""}
            maxLength={2000}
          />
        </label>
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          Save details
        </Button>
      </form>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Questions</h2>
        {detail.questions.length === 0 ? (
          <EmptyState
            framed={false}
            className="mt-3 p-0"
            title="No questions on this assessment"
            actionHref="/manager/assessments/new"
            actionLabel="New assessment"
          >
            Questions are set when you create an assessment. Start a new one if
            you need a different set.
          </EmptyState>
        ) : (
        <ol className="mt-4 space-y-3">
          {detail.questions.map((question, index) => (
            <li key={question.id} className="rounded-lg border border-border bg-black/20 p-4">
              <p className="text-sm text-muted-foreground">
                {index + 1}.{" "}
                {question.question_type === "single_select" ? "Multiple choice" : "Short text"}
              </p>
              <p className="mt-1 font-medium">{question.prompt}</p>
              {question.options ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {question.options.map((option) => (
                    <li key={option}>{option}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Assign</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fathers in your group. Already assigned stay checked.
        </p>
        {detail.roster.length === 0 ? (
          <EmptyState
            framed={false}
            className="mt-4 p-0"
            title="No one has joined yet"
            actionHref="/manager"
            actionLabel="Open dashboard"
          >
            Share your invite code from the dashboard so fathers can create an
            account. Then you can assign this assessment.
          </EmptyState>
        ) : (
          <form action={assignAssessment} className="mt-4 space-y-4">
            <input type="hidden" name="assessment_id" value={detail.assessment.id} />
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {detail.roster.map((father) => {
                const assigned = assignedIds.has(father.fatherId);
                return (
                  <li key={father.fatherId}>
                    <label
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-3 px-4 py-3",
                        interactiveSurfaceClassName,
                        "has-[:disabled]:pointer-events-none has-[:disabled]:hover:bg-transparent"
                      )}
                    >
                      <input
                        type="checkbox"
                        name="father_ids"
                        value={father.fatherId}
                        defaultChecked={assigned}
                        disabled={assigned}
                        className="size-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{father.name}</span>
                        {assigned ? (
                          <span className="text-sm text-muted-foreground">Already assigned</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {unassigned.length > 0 ? (
              <Button type="submit" className="w-full sm:w-auto">
                Assign selected
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Everyone in your group is assigned.</p>
            )}
          </form>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Assignments</h2>
        {detail.assignments.length === 0 ? (
          <EmptyState
            framed={false}
            className="mt-3 p-0"
            title="No one is assigned yet"
          >
            Choose fathers above and assign this assessment. Responses show up
            here after they start.
          </EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {detail.assignments.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/manager/assessments/${detail.assessment.id}/responses/${row.father_id}`}
                  className={cn(
                    "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
                    interactiveSurfaceClassName
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{row.fatherName}</p>
                    <p className="text-sm text-muted-foreground">
                      {ASSIGNMENT_STATUS_LABEL[row.status]}
                    </p>
                  </div>
                  <span
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "pointer-events-none w-full sm:w-auto"
                    )}
                  >
                    View responses
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
