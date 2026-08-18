import { notFound, redirect } from "next/navigation";

import { SessionAdvanceButton } from "@/components/father/session-advance-button";
import { SessionCheckinFields } from "@/components/father/session-checkin-fields";
import { SessionHeader } from "@/components/father/session-header";
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
    redirect(context.gateRedirect ?? `/father/sessions/${context.redirectSessionId}`);
  }

  if (!context.progress?.film_completed) {
    redirect(`/father/sessions/${sessionId}`);
  }

  if (context.progress.checkin_completed) {
    redirect(`/father/sessions/${sessionId}/action`);
  }

  const { t } = await getI18n();
  const { session, training, progress, completedCount, sessionTotal } = context;
  const questions = checkinQuestionsFor(session, training);
  const canAutoAdvance =
    questions.length === 1 && Boolean(parseSkillPrompt(questions[0].label).choices);

  return (
    <div className="mx-auto max-w-2xl space-y-5 lg:space-y-6">
      <SessionHeader
        training={training}
        session={session}
        current="checkin"
        completedCount={completedCount}
        sessionTotal={sessionTotal}
        backHref={`/father/sessions/${sessionId}`}
        filmCompleted
        checkinCompleted={Boolean(progress?.checkin_completed)}
      />

      <Flash error={error} />

      <form action={submitCheckin} className="space-y-5 lg:space-y-6">
        <input type="hidden" name="session_id" value={session.id} />
        <SessionCheckinFields
          questions={questions}
          answers={progress?.checkin_answers}
          invalid={Boolean(error)}
          autoAdvance={canAutoAdvance}
        />
        <SessionAdvanceButton
          label={t("common.next")}
          visuallyHidden={canAutoAdvance}
        />
      </form>
    </div>
  );
}
