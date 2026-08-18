import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SessionActionFields } from "@/components/father/session-action-fields";
import { SessionAdvanceButton } from "@/components/father/session-advance-button";
import { SessionHeader } from "@/components/father/session-header";
import { Flash } from "@/components/manager/flash";
import { requireRole } from "@/lib/auth/session";
import { completeAction } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { parseSkillPrompt, sessionAction } from "@/lib/father/session-questions";
import { getI18n } from "@/lib/i18n/server";
import { interactiveUnderlineClassName } from "@/lib/ui";
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
    redirect(context.gateRedirect ?? `/father/sessions/${context.redirectSessionId}`);
  }

  if (!context.progress?.film_completed) {
    redirect(`/father/sessions/${sessionId}`);
  }

  if (!context.progress.checkin_completed) {
    redirect(`/father/sessions/${sessionId}/checkin`);
  }

  if (context.progress.action_completed) {
    redirect(`/father?done=${encodeURIComponent(context.session.id)}`);
  }

  const { t } = await getI18n();
  const { session, training, progress, completedCount, sessionTotal } = context;
  const prompt = sessionAction(session, training);
  const hasChoices = Boolean(parseSkillPrompt(prompt).choices?.length);

  return (
    <div className="mx-auto max-w-xl space-y-5 lg:space-y-8">
      <SessionHeader
        training={training}
        session={session}
        current="action"
        completedCount={completedCount}
        sessionTotal={sessionTotal}
        backHref={`/father/sessions/${sessionId}/checkin`}
        filmCompleted
        checkinCompleted
      />

      <Flash error={error} />

      <form action={completeAction} className="space-y-5">
        <input type="hidden" name="session_id" value={session.id} />
        <SessionActionFields
          prompt={prompt}
          defaultValue={progress?.action_note ?? undefined}
          invalid={Boolean(error)}
          autoAdvance={hasChoices}
          t={t}
        />
        <SessionAdvanceButton
          label={t("father.session.completeAction")}
          visuallyHidden={hasChoices}
        />
      </form>

      <p className="text-center">
        <Link
          href="/father"
          className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}
        >
          {t("father.session.doLater")}
        </Link>
      </p>
    </div>
  );
}
