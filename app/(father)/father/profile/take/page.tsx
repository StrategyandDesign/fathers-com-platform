import Link from "next/link";
import { redirect } from "next/navigation";

import { Flash } from "@/components/manager/flash";
import { ProfileAnswerOptions } from "@/components/profile/answer-options";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth/session";
import { saveProfileProgress } from "@/lib/father/profile-actions";
import { ensureProfileDraft, loadLatestProfile } from "@/lib/father/profile";
import {
  PROFILE_QUESTION_COUNT,
  PROFILE_SCALE,
  answeredCount,
  getProfileQuestion,
} from "@/lib/father/questions";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function FatherProfileTakePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("father");
  const completed = await loadLatestProfile(user.id);

  if (completed) {
    redirect("/father/profile/results");
  }

  const draft = await ensureProfileDraft(user.id);
  const requested = Number(params.q ?? draft.current_index);
  const questionId = Number.isInteger(requested)
    ? Math.min(PROFILE_QUESTION_COUNT, Math.max(1, requested))
    : draft.current_index;
  const question = getProfileQuestion(questionId);

  if (!question) {
    redirect("/father/profile");
  }

  const saved = draft.answers[String(question.id)];
  const answered = answeredCount(draft.answers);
  const isLast = question.id === PROFILE_QUESTION_COUNT;
  const percent = Math.round((answered / PROFILE_QUESTION_COUNT) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Question {question.id} of {PROFILE_QUESTION_COUNT}
        </p>
        <ProgressBar value={percent} />
      </div>

      <form
        key={question.id}
        action={isLast ? "/api/profile/evaluate" : saveProfileProgress}
        method="post"
        className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6"
      >
        <h1 className="font-heading text-lg font-semibold leading-snug sm:text-xl lg:text-2xl">
          {question.text}
        </h1>
        <ProfileAnswerOptions
          options={PROFILE_SCALE}
          saved={saved}
          autoAdvance={!isLast}
        />
        <input type="hidden" name="question_id" value={question.id} />
        {params.error ? (
          <div className="mt-4">
            <Flash error={params.error} />
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 lg:mt-10 lg:flex-row lg:flex-wrap lg:items-center lg:justify-center">
          {isLast ? (
            <button
              type="submit"
              className={cn(buttonVariants({ size: "lg" }), "w-full lg:order-2 lg:w-auto")}
            >
              See my results
            </button>
          ) : (
            <button
              type="submit"
              name="intent"
              value="next"
              data-profile-advance
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "w-full lg:order-2 lg:w-auto"
              )}
            >
              Next
            </button>
          )}
          {question.id > 1 ? (
            <button
              type="submit"
              name="intent"
              value="back"
              formNoValidate
              formAction={saveProfileProgress}
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
            formAction={saveProfileProgress}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "w-full lg:order-3 lg:w-auto max-lg:border-0 max-lg:bg-transparent max-lg:underline max-lg:underline-offset-4 max-lg:hover:bg-transparent max-lg:hover:text-foreground/80"
            )}
          >
            Save & Exit
          </button>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLast
            ? "Choose an answer, then confirm to see your results."
            : "You can stop and continue anytime."}
        </p>
      </form>

      <p className="text-center">
        <Link
          href="/father/profile"
          className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
        >
          Back to Profile
        </Link>
      </p>
    </div>
  );
}
