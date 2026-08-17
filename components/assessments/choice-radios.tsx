"use client";

import { useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { useFormStatus } from "react-dom";

import { useT } from "@/components/i18n/locale-provider";
import { radioOptionClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function AssessmentChoiceRadios({
  options,
  saved,
  autoAdvance,
  invalid,
}: {
  options: string[];
  saved?: string;
  autoAdvance: boolean;
  invalid?: boolean;
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
    const nextButton = form.querySelector<HTMLButtonElement>("[data-assessment-advance]");
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
      className={cn("mt-8 space-y-1", locked && "pointer-events-none")}
      aria-invalid={invalid || undefined}
    >
      <legend className="sr-only">{t("father.assessments.answer")}</legend>
      {options.map((option) => (
        <label key={option} className={radioOptionClassName}>
          <input
            type="radio"
            name="value"
            value={option}
            defaultChecked={saved === option}
            required
            className="size-4 accent-primary"
            onClick={handleClick}
            onChange={handleChange}
          />
          <span>{option}</span>
        </label>
      ))}
      {locked && autoAdvance ? (
        <p className="pt-2 text-center text-sm text-muted-foreground">{t("common.saving")}</p>
      ) : null}
    </fieldset>
  );
}
