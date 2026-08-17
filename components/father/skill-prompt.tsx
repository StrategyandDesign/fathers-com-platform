import { choiceIsSelected, parseSkillPrompt } from "@/lib/father/session-questions";
import { getI18n } from "@/lib/i18n/server";
import { radioOptionClassName, textareaClassName } from "@/lib/ui";

export async function SkillPromptField({
  name,
  prompt,
  defaultValue,
  invalid,
  required = true,
}: {
  name: string;
  prompt: string;
  defaultValue?: string;
  invalid?: boolean;
  required?: boolean;
}) {
  const { t } = await getI18n();
  const parsed = parseSkillPrompt(prompt);

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold leading-snug sm:text-lg lg:text-xl">
        {parsed.stem}
      </p>
      {parsed.choices ? (
        <fieldset className="space-y-1" aria-invalid={invalid || undefined}>
          <legend className="sr-only">{t("father.session.chooseTeaching")}</legend>
          {parsed.choices.map((choice) => (
            <label key={choice.value} className={radioOptionClassName}>
              <input
                type="radio"
                name={name}
                value={choice.value}
                required={required}
                defaultChecked={choiceIsSelected(defaultValue, choice)}
                className="size-4 accent-primary"
              />
              <span>
                {choice.value}) {choice.label}
              </span>
            </label>
          ))}
        </fieldset>
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
