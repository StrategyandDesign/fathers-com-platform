import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SessionHeader } from "@/components/father/session-header";
import { SkillPromptField } from "@/components/father/skill-prompt";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { submitCheckin } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { checkinQuestionsFor } from "@/lib/father/session-questions";
import { interactiveUnderlineClassName, sessionCtaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function SessionCheckinPage({
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

  const { session, training, progress } = context;
  const questions = checkinQuestionsFor(session, training);

  return (
    <div className="mx-auto max-w-2xl space-y-6 lg:space-y-8">
      <SessionHeader
        training={training}
        session={session}
        current="checkin"
        backHref={`/father/sessions/${sessionId}`}
      />

      <form action={submitCheckin} className="space-y-6 lg:space-y-8">
        <input type="hidden" name="session_id" value={session.id} />
        {questions.map((question, index) => (
          <div key={question.key} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Question {index + 1} of {questions.length}
            </p>
            <SkillPromptField
              name={question.key}
              prompt={question.label}
              defaultValue={progress?.checkin_answers?.[question.key]}
              invalid={Boolean(error)}
            />
          </div>
        ))}
        <Flash error={error} />
        <p className="text-center text-sm text-muted-foreground">
          Your answers are saved to this session’s progress. They are a skill
          check, not a personal journal.
        </p>
        <div className="flex justify-center max-lg:block">
          <Button type="submit" variant="inverse" size="lg" className={sessionCtaClassName}>
            {progress?.checkin_completed ? "Save and continue" : "Next"}
          </Button>
        </div>
      </form>

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
