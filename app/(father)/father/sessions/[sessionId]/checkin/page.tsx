import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SessionAdvanceButton } from "@/components/father/session-advance-button";
import { SessionHeader } from "@/components/father/session-header";
import { SkillPromptField } from "@/components/father/skill-prompt";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { submitCheckin } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { checkinQuestionsFor, parseSkillPrompt } from "@/lib/father/session-questions";
import { getI18n } from "@/lib/i18n/server";
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

  const { t } = await getI18n();
  const { session, training, progress } = context;
  const questions = checkinQuestionsFor(session, training);
  const alreadyDone = Boolean(progress?.checkin_completed);
  const canAutoAdvance =
    questions.length === 1 && Boolean(parseSkillPrompt(questions[0].label).choices);

  return (
    <div className="mx-auto max-w-2xl space-y-5 lg:space-y-6">
      <SessionHeader
        training={training}
        session={session}
        current="checkin"
        backHref={`/father/sessions/${sessionId}`}
      />

      <Flash error={error} />

      {alreadyDone ? (
        <div className="flex justify-center max-lg:block">
          <Link
            href={`/father/sessions/${session.id}/action`}
            className={cn(buttonVariants({ variant: "inverse", size: "lg" }), sessionCtaClassName)}
          >
            {t("father.session.continueAction")}
          </Link>
        </div>
      ) : (
        <form action={submitCheckin} className="space-y-5 lg:space-y-6">
          <input type="hidden" name="session_id" value={session.id} />
          {questions.map((question) => (
            <SkillPromptField
              key={question.key}
              name={question.key}
              prompt={question.label}
              defaultValue={progress?.checkin_answers?.[question.key]}
              invalid={Boolean(error)}
              autoAdvance={canAutoAdvance}
            />
          ))}
          <SessionAdvanceButton
            label={t("common.next")}
            visuallyHidden={canAutoAdvance}
          />
        </form>
      )}

      <p className="text-center">
        <Link
          href={`/father/sessions/${sessionId}`}
          className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}
        >
          {t("father.session.backToSession")}
        </Link>
      </p>
    </div>
  );
}
