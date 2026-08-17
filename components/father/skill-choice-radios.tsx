"use client";

import { useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { useFormStatus } from "react-dom";

import { useT } from "@/components/i18n/locale-provider";
import { choiceIsSelected, type SkillChoice } from "@/lib/father/session-questions";
import { radioOptionClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function SkillChoiceRadios({
  name,
  choices,
  defaultValue,
  autoAdvance,
  invalid,
  required = true,
}: {
  name: string;
  choices: SkillChoice[];
  defaultValue?: string;
  autoAdvance: boolean;
  invalid?: boolean;
  required?: boolean;
}) {
  const t = useT();
  const { pending } = useFormStatus();
  const [advancing, setAdvancing] = useState(false);
  const started = useRef(false);
  const locked = pending || advancing;

  function advance(form: HTMLFormElement | null) {
    if (!autoAdvance || locked || started.current || !form) return;
    started.current = true;
    setAdvancing(true);
    const nextButton = form.querySelector<HTMLButtonElement>("[data-session-advance]");
    requestAnimationFrame(() => {
      form.requestSubmit(nextButton ?? undefined);
    });
  }

  function handleClick(event: MouseEvent<HTMLInputElement>) {
    advance(event.currentTarget.form);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    advance(event.currentTarget.form);
  }

  return (
    <fieldset
      className={cn("space-y-1", locked && "pointer-events-none")}
      aria-invalid={invalid || undefined}
    >
      <legend className="sr-only">{t("father.session.chooseTeaching")}</legend>
      {choices.map((choice) => (
        <label key={choice.value} className={radioOptionClassName}>
          <input
            type="radio"
            name={name}
            value={choice.value}
            required={required}
            defaultChecked={choiceIsSelected(defaultValue, choice)}
            className="size-4 accent-primary"
            onClick={handleClick}
            onChange={handleChange}
          />
          <span>
            {choice.value}) {choice.label}
          </span>
        </label>
      ))}
      {locked && autoAdvance ? (
        <p className="pt-2 text-center text-sm text-muted-foreground">{t("common.saving")}</p>
      ) : null}
    </fieldset>
  );
}
