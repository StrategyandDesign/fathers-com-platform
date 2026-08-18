"use client";

import { useAutoAdvanceSubmit } from "@/components/form/use-auto-advance-submit";
import { useT } from "@/components/i18n/locale-provider";
import { radioOptionClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

type ScaleOption = {
  value: number;
  label: string;
};

export function ProfileAnswerOptions({
  options,
  saved,
  autoAdvance,
  invalid,
}: {
  options: readonly ScaleOption[];
  saved?: number;
  autoAdvance: boolean;
  invalid?: boolean;
}) {
  const t = useT();
  return (
    <fieldset className="mt-8">
      <legend className="sr-only">{t("common.answer")}</legend>
      <ProfileAnswerRadios
        options={options}
        saved={saved}
        autoAdvance={autoAdvance}
        invalid={invalid}
      />
    </fieldset>
  );
}

function ProfileAnswerRadios({
  options,
  saved,
  autoAdvance,
  invalid,
}: {
  options: readonly ScaleOption[];
  saved?: number;
  autoAdvance: boolean;
  invalid?: boolean;
}) {
  const { locked, handleChange } = useAutoAdvanceSubmit(
    autoAdvance,
    "[data-profile-advance]"
  );

  return (
    <div
      className={cn("space-y-1", locked && "pointer-events-none")}
      aria-invalid={invalid || undefined}
    >
      {options.map((option) => (
        <label key={option.value} className={radioOptionClassName}>
          <input
            type="radio"
            name="value"
            value={option.value}
            defaultChecked={saved === option.value}
            required
            className="size-4 accent-primary"
            onChange={handleChange}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
