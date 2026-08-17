import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SessionHeader } from "@/components/father/session-header";
import { SkillPromptField } from "@/components/father/skill-prompt";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { completeAction } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import {
  ACTION_ANSWER_KEY,
  ACTION_NOTE_LABEL,
  ACTION_NOTE_PLACEHOLDER,
  parseSkillPrompt,
  sessionAction,
} from "@/lib/father/session-questions";
import { interactiveUnderlineClassName, sessionCtaClassName, textareaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function SessionActionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { sessionId } = await params;
  const { error } = await searchParams;
  const { user } = await requireRole("father");
  const context = await loadSessionContext(user.id, sessionId);

  if (!context) {
    notFound();
  }

  if (!context.unlocked) {
    redirect(`/father/sessions/${context.redirectSessionId}`);
  }

  if (!context.progress?.film_completed) {
    redirect(`/father/sessions/${sessionId}`);
  }

  if (!context.progress.checkin_completed) {
    redirect(`/father/sessions/${sessionId}/checkin`);
  }

  const { session, training, progress } = context;
  const prompt = sessionAction(session, training);
  const parsed = parseSkillPrompt(prompt);
  const alreadyDone = Boolean(progress?.action_completed);

  return (
    <div className="mx-auto max-w-xl space-y-6 lg:space-y-10">
      <SessionHeader
        training={training}
        session={session}
        current="action"
        backHref={`/father/sessions/${sessionId}`}
      />

      <Flash error={error} />

      {alreadyDone ? (
        <div className="space-y-6">
          <p className="rounded-xl border border-border bg-card px-4 py-5 text-center text-lg font-semibold leading-snug sm:px-5 sm:py-6 sm:text-xl lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:text-2xl">
            {parsed.stem}
          </p>
          <p className="text-center text-sm text-muted-foreground">
            This Action is complete.
          </p>
          <div className="flex justify-center max-lg:block">
            <Link
              href="/father"
              className={cn(buttonVariants({ variant: "inverse", size: "lg" }), sessionCtaClassName)}
            >
              Continue to Home
            </Link>
          </div>
        </div>
      ) : (
        <form action={completeAction} className="space-y-6">
          <input type="hidden" name="session_id" value={session.id} />
          {parsed.choices ? (
            <SkillPromptField
              name={ACTION_ANSWER_KEY}
              prompt={prompt}
              defaultValue={progress?.action_note ?? undefined}
              invalid={Boolean(error)}
            />
          ) : (
            <div className="space-y-3">
              <p className="rounded-xl border border-border bg-card px-4 py-5 text-center text-lg font-semibold leading-snug sm:px-5 sm:py-6 sm:text-xl lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:text-2xl">
                {prompt}
              </p>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">{ACTION_NOTE_LABEL}</span>
                <textarea
                  className={textareaClassName}
                  name="action_note"
                  required
                  placeholder={ACTION_NOTE_PLACEHOLDER}
                  defaultValue={progress?.action_note ?? ""}
                  aria-invalid={Boolean(error) || undefined}
                />
              </label>
            </div>
          )}
          <div className="flex flex-col gap-3 lg:items-center">
            <Button type="submit" variant="inverse" size="lg" className={sessionCtaClassName}>
              Complete this Action
            </Button>
            <Link
              href="/father"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "w-full min-h-11 max-lg:border-border max-lg:bg-transparent max-lg:text-foreground max-lg:hover:bg-white/5 lg:w-auto"
              )}
            >
              I’ll do this later
            </Link>
          </div>
        </form>
      )}

      <p className="text-center">
        <Link
          href={`/father/sessions/${sessionId}`}
          className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}
        >
          Back to Session
        </Link>
      </p>
    </div>
  );
}
