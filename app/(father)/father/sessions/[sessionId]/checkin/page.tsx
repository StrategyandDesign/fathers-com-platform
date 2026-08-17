import { notFound, redirect } from "next/navigation";

import { SessionAdvanceButton } from "@/components/father/session-advance-button";
import { SessionHeader } from "@/components/father/session-header";
import { SkillPromptField } from "@/components/father/skill-prompt";
import { Flash } from "@/components/manager/flash";
import { requireRole } from "@/lib/auth/session";
import { submitCheckin } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { checkinQuestionsFor, parseSkillPrompt } from "@/lib/father/session-questions";
import { getI18n } from "@/lib/i18n/server";

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

  if (context.progress.checkin_completed) {
    redirect(`/father/sessions/${sessionId}/action`);
  }

  const { t } = await getI18n();
  const { session, training, progress } = context;
  const questions = checkinQuestionsFor(session, training);
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
    </div>
  );
}
