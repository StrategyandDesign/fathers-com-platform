import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { saveProfileProgress } from "@/lib/father/profile-actions";
import { ensureProfileDraft, loadLatestProfile } from "@/lib/father/profile";
import {
  PROFILE_QUESTION_COUNT,
  PROFILE_SCALE,
  answeredCount,
  getProfileQuestion,
} from "@/lib/father/questions";

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
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/father" className="hover:underline">
            Home
          </Link>
          <span className="px-1.5">/</span>
          <Link href="/father/profile" className="hover:underline">
            Father Profile
          </Link>
        </p>
        <p className="text-sm font-medium">
          Question {question.id} of {PROFILE_QUESTION_COUNT}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{answered} answered</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{question.text}</CardTitle>
          <CardDescription>How true is this of you?</CardDescription>
        </CardHeader>
        <form
          action={isLast ? "/api/profile/evaluate" : saveProfileProgress}
          method="post"
        >
          <CardContent className="space-y-2">
            <input type="hidden" name="question_id" value={question.id} />
            <fieldset className="space-y-2">
              <legend className="sr-only">Answer</legend>
              {PROFILE_SCALE.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-input px-3 py-2 text-sm has-[:checked]:border-foreground/30 has-[:checked]:bg-muted"
                >
                  <input
                    type="radio"
                    name="value"
                    value={option.value}
                    defaultChecked={saved === option.value}
                    className="size-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
            {params.error ? (
              <p className="text-sm text-destructive">{params.error}</p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {question.id > 1 ? (
              <button
                type="submit"
                name="intent"
                value="back"
                formAction={saveProfileProgress}
                className={buttonVariants({ variant: "outline" })}
              >
                Back
              </button>
            ) : null}
            <button
              type="submit"
              name="intent"
              value="exit"
              formAction={saveProfileProgress}
              className={buttonVariants({ variant: "outline" })}
            >
              Save & Exit
            </button>
            {isLast ? (
              <button type="submit" className={buttonVariants()}>
                See my results
              </button>
            ) : (
              <button
                type="submit"
                name="intent"
                value="next"
                className={buttonVariants()}
              >
                Next
              </button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
