import { SkillChoiceRadios } from "@/components/father/skill-choice-radios";
import { parseSkillPrompt } from "@/lib/father/session-questions";
import { textareaClassName } from "@/lib/ui";

export function SkillPromptField({
  name,
  prompt,
  defaultValue,
  invalid,
  required = true,
  autoAdvance = false,
}: {
  name: string;
  prompt: string;
  defaultValue?: string;
  invalid?: boolean;
  required?: boolean;
  autoAdvance?: boolean;
}) {
  const parsed = parseSkillPrompt(prompt);

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold leading-snug sm:text-lg lg:text-xl">
        {parsed.stem}
      </p>
      {parsed.choices ? (
        <SkillChoiceRadios
          name={name}
          choices={parsed.choices}
          defaultValue={defaultValue}
          autoAdvance={autoAdvance}
          invalid={invalid}
          required={required}
        />
      ) : (
        <textarea
          className={textareaClassName}
          name={name}
          required={required}
          aria-invalid={invalid || undefined}
          defaultValue={defaultValue ?? ""}
        />
      )}
    </div>
  );
}
