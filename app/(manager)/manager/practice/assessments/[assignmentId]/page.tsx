import { notFound } from "next/navigation";

import { AssessmentChoiceRadios } from "@/components/assessments/choice-radios";
import { AssessmentResultsAward } from "@/components/assessments/results-award";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { loadProfileFullName } from "@/lib/account/data";
import { saveCustomAnswer } from "@/lib/assessments/actions";
import { loadAssignmentTake } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerOrgPhotoCovers, resolveHomeProfileCover } from "@/lib/org-photos/data";
import { PRACTICE_ROOT } from "@/lib/practice/paths";
import { interactiveLinkClassName, textareaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function LeaderPracticeAssessmentTakePage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ q?: string; error?: string; notice?: string }>;
}) {
  const { assignmentId } = await params;
  const query = await searchParams;
  const { user } = await requireRole("manager");
  const { t } = await getI18n();
  const ctx = await loadAssignmentTake(user.id, assignmentId);

  if (!ctx) {
    notFound();
  }

  if (ctx.questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <EmptyState
          title={t("father.assessments.notReadyTitle")}
          actionHref={PRACTICE_ROOT}
          actionLabel={t("manager.practice.backToPath")}
        >
          {t("father.assessments.notReadyBody")}
        </EmptyState>
      </div>
    );
  }

  const completed = ctx.assignment.status === "completed";
  if (completed) {
    const [orgPhotos, name] = await Promise.all([
      loadManagerOrgPhotoCovers(user.id),
      loadProfileFullName(user.id),
    ]);
    return (
      <AssessmentResultsAward
        assessment={ctx.assessment}
        assignment={ctx.assignment}
        questions={ctx.questions}
        answers={ctx.answers}
        coverSrc={resolveHomeProfileCover(orgPhotos.profileUrl, orgPhotos.photoPack)}
        fatherName={name}
        homeHref={PRACTICE_ROOT}
        listHref={`${PRACTICE_ROOT}#assessments`}
      />
    );
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

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{ctx.assessment.title}</p>
        <p className="text-sm text-muted-foreground">
          {t("father.home.questionOf", { n: questionNumber, total: ctx.questions.length })}
        </p>
        <ProgressBar value={percent} />
      </div>

      <Flash error={query.error} notice={query.notice} />

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
          <AssessmentChoiceRadios
            options={question.options}
            saved={saved}
            autoAdvance
            invalid={Boolean(query.error)}
          />
        ) : (
          <label className="mt-8 block space-y-2">
            <span className="sr-only">{t("father.assessments.answer")}</span>
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

        <div className="mt-8 flex flex-col gap-3 lg:mt-10 lg:items-center">
          <button
            type="submit"
            name="intent"
            value={isLast ? "complete" : "next"}
            data-assessment-advance
            className={
              question.question_type === "single_select"
                ? "sr-only"
                : cn(buttonVariants({ size: "lg" }), "w-full min-h-12 lg:w-auto")
            }
          >
            {isLast ? t("father.assessments.submit") : t("common.next")}
          </button>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {questionNumber > 1 ? (
              <button
                type="submit"
                name="intent"
                value="back"
                formNoValidate
                className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
              >
                {t("common.back")}
              </button>
            ) : null}
            <button
              type="submit"
              name="intent"
              value="exit"
              formNoValidate
              className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
            >
              {t("father.assessments.saveExit")}
            </button>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("father.assessments.canStop")}
        </p>
      </form>
    </div>
  );
}
