import { ActionTryAtField } from "@/components/father/action-try-at-field";
import { SkillPromptField } from "@/components/father/skill-prompt";
import { ACTION_ANSWER_KEY, parseSkillPrompt } from "@/lib/father/session-questions";
import type { Translate } from "@/lib/i18n/translate";
import { textareaClassName } from "@/lib/ui";

export function SessionActionFields({
  prompt,
  defaultValue,
  invalid,
  autoAdvance = false,
  t,
  sessionId,
  defaultTryAt,
}: {
  prompt: string;
  defaultValue?: string;
  invalid?: boolean;
  autoAdvance?: boolean;
  t: Translate;
  sessionId?: string;
  defaultTryAt?: string | null;
}) {
  const parsed = parseSkillPrompt(prompt);
  const hasChoices = Boolean(parsed.choices?.length);

  return (
    <div className="space-y-5">
      {hasChoices ? (
        <SkillPromptField
          name={ACTION_ANSWER_KEY}
          prompt={prompt}
          defaultValue={defaultValue}
          invalid={invalid}
          autoAdvance={autoAdvance}
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
              defaultValue={defaultValue ?? ""}
              aria-invalid={invalid || undefined}
            />
          </label>
        </div>
      )}
      {sessionId ? (
        <ActionTryAtField
          sessionId={sessionId}
          defaultValue={defaultTryAt}
          label={t("father.session.actionTryAt")}
        />
      ) : null}
    </div>
  );
}
