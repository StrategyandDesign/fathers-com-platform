import Link from "next/link";
import { notFound } from "next/navigation";

import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { saveCustomAnswer } from "@/lib/assessments/actions";
import { loadAssignmentTake } from "@/lib/assessments/data";
import { ASSIGNMENT_STATUS_LABEL } from "@/lib/assessments/types";
import { requireRole } from "@/lib/auth/session";
import { interactiveLinkClassName, radioOptionClassName, textareaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function FatherAssessmentTakePage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ q?: string; error?: string; notice?: string }>;
}) {
  const { assignmentId } = await params;
  const query = await searchParams;
  const { user } = await requireRole("father");
  const ctx = await loadAssignmentTake(user.id, assignmentId);

  if (!ctx || ctx.questions.length === 0) {
    notFound();
  }

  const answered = ctx.questions.filter((question) => ctx.answers.get(question.id)?.trim()).length;
  const firstOpen = ctx.questions.findIndex((question) => !ctx.answers.get(question.id)?.trim());
  const requested = Number(query.q ?? (firstOpen >= 0 ? firstOpen + 1 : 1));
  const questionNumber = Number.isInteger(requested)
    ? Math.min(ctx.questions.length, Math.max(1, requested))
    : 1;
  const question = ctx.questions[questionNumber - 1];
  const saved = ctx.answers.get(question.id) ?? "";
  const isLast = questionNumber === ctx.questions.length;
  const percent = Math.round((answered / ctx.questions.length) * 100);
  const completed = ctx.assignment.status === "completed";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{ctx.assessment.title}</p>
        <p className="text-sm text-muted-foreground">
          {completed
            ? ASSIGNMENT_STATUS_LABEL.completed
            : `Question ${questionNumber} of ${ctx.questions.length}`}
        </p>
        <ProgressBar value={completed ? 100 : percent} />
      </div>

      <Flash error={query.error} notice={query.notice} />

      {completed ? (
        <div className="space-y-4">
          {ctx.questions.map((item, index) => (
            <section key={item.id} className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
              <p className="text-sm text-muted-foreground">Question {index + 1}</p>
              <h2 className="mt-1 font-heading text-lg font-semibold">{item.prompt}</h2>
              <p className="mt-4 whitespace-pre-wrap text-muted-foreground">
                {ctx.answers.get(item.id) ?? "—"}
              </p>
            </section>
          ))}
        </div>
      ) : (
        <form
          key={question.id}
          action={saveCustomAnswer}
          className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6"
        >
          <h1 className="font-heading text-lg font-semibold leading-snug sm:text-xl lg:text-2xl">
            {question.prompt}
          </h1>
          <input type="hidden" name="assignment_id" value={ctx.assignment.id} />
          <input type="hidden" name="question_id" value={question.id} />

          {question.question_type === "single_select" && question.options ? (
            <fieldset className="mt-8 space-y-1">
              <legend className="sr-only">Answer</legend>
              {question.options.map((option) => (
                <label
                  key={option}
                  className={radioOptionClassName}
                >
                  <input
                    type="radio"
                    name="value"
                    value={option}
                    defaultChecked={saved === option}
                    required
                    className="size-4 accent-primary"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <label className="mt-8 block space-y-2">
              <span className="sr-only">Answer</span>
              <textarea
                className={textareaClassName}
                name="value"
                defaultValue={saved}
                rows={5}
                required
                aria-invalid={Boolean(query.error) || undefined}
              />
            </label>
          )}

          <div className="mt-8 flex flex-col gap-3 lg:mt-10 lg:flex-row lg:flex-wrap lg:items-center lg:justify-center">
            <button
              type="submit"
              name="intent"
              value={isLast ? "complete" : "next"}
              className={cn(buttonVariants({ size: "lg" }), "w-full lg:order-2 lg:w-auto")}
            >
              {isLast ? "Submit" : "Next"}
            </button>
            {questionNumber > 1 ? (
              <button
                type="submit"
                name="intent"
                value="back"
                formNoValidate
                className={cn(buttonVariants({ variant: "secondary" }), "w-full lg:order-1 lg:w-auto")}
              >
                Back
              </button>
            ) : null}
            <button
              type="submit"
              name="intent"
              value="exit"
              formNoValidate
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "w-full lg:order-3 lg:w-auto max-lg:border-0 max-lg:bg-transparent max-lg:underline max-lg:underline-offset-4 max-lg:hover:bg-transparent max-lg:hover:text-foreground/80"
              )}
            >
              Save & Exit
            </button>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            You can stop and continue anytime.
          </p>
        </form>
      )}

      <p className="text-center">
        <Link href="/father" className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}>
          Back to Home
        </Link>
      </p>
    </div>
  );
}
