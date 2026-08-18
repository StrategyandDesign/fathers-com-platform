"use client";

import { useAutoAdvanceSubmit } from "@/components/form/use-auto-advance-submit";
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
  const { locked, handleChange } = useAutoAdvanceSubmit(
    autoAdvance,
    "[data-assessment-advance]"
  );

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
