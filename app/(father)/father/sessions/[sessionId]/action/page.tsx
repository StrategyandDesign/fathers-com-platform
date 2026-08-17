import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SessionAdvanceButton } from "@/components/father/session-advance-button";
import { SessionHeader } from "@/components/father/session-header";
import { SkillPromptField } from "@/components/father/skill-prompt";
import { Flash } from "@/components/manager/flash";
import { requireRole } from "@/lib/auth/session";
import { completeAction } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import {
  ACTION_ANSWER_KEY,
  parseSkillPrompt,
  sessionAction,
} from "@/lib/father/session-questions";
import { getI18n } from "@/lib/i18n/server";
import { interactiveUnderlineClassName, textareaClassName } from "@/lib/ui";
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

  if (context.progress.action_completed) {
    redirect(`/father?done=${encodeURIComponent(context.session.id)}`);
  }

  const { t } = await getI18n();
  const { session, training, progress } = context;
  const prompt = sessionAction(session, training);
  const parsed = parseSkillPrompt(prompt);
  const hasChoices = Boolean(parsed.choices?.length);

  return (
    <div className="mx-auto max-w-xl space-y-5 lg:space-y-8">
      <SessionHeader
        training={training}
        session={session}
        current="action"
        backHref={`/father/sessions/${sessionId}`}
      />

      <Flash error={error} />

      <form action={completeAction} className="space-y-5">
        <input type="hidden" name="session_id" value={session.id} />
        {hasChoices ? (
          <SkillPromptField
            name={ACTION_ANSWER_KEY}
            prompt={prompt}
            defaultValue={progress?.action_note ?? undefined}
            invalid={Boolean(error)}
            autoAdvance
          />
        ) : (
          <div className="space-y-3">
            <p className="rounded-xl border border-border bg-card px-4 py-5 text-center text-lg font-semibold leading-snug sm:px-5 sm:py-6 sm:text-xl lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:text-2xl">
              {prompt}
            </p>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">{t("father.session.actionNoteLabel")}</span>
              <textarea
                className={textareaClassName}
                name="action_note"
                required
                placeholder={t("father.session.actionNotePlaceholder")}
                defaultValue={progress?.action_note ?? ""}
                aria-invalid={Boolean(error) || undefined}
              />
            </label>
          </div>
        )}
        <SessionAdvanceButton
          label={t("father.session.completeAction")}
          visuallyHidden={hasChoices}
        />
      </form>

      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
        <Link
          href="/father"
          className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}
        >
          {t("father.session.doLater")}
        </Link>
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
