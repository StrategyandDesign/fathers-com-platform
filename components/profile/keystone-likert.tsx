"use client";

import { useAutoAdvanceSubmit } from "@/components/form/use-auto-advance-submit";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

type ScaleOption = {
  value: number;
  label: string;
};

const KEYSTONE_ADVANCE_MS = 200;

export function KeystoneLikert({
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
  const { locked, handleChange } = useAutoAdvanceSubmit(
    autoAdvance,
    "[data-profile-advance]",
    KEYSTONE_ADVANCE_MS
  );

  return (
    <fieldset className="mt-8">
      <legend className="sr-only">{t("common.answer")}</legend>
      <div
        className={cn(
          "flex flex-col gap-2 sm:grid sm:grid-cols-5 sm:gap-2",
          locked && "pointer-events-none"
        )}
        aria-invalid={invalid || undefined}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-border px-3 py-3 text-center text-sm leading-tight",
              "outline-none transition-[color,background-color,border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
              "has-[:checked]:border-primary has-[:checked]:bg-primary/15",
              "focus-within:ring-3 focus-within:ring-ring/50",
              "sm:min-h-14 sm:px-2 sm:text-xs"
            )}
          >
            <input
              type="radio"
              name="value"
              value={option.value}
              defaultChecked={saved === option.value}
              required
              className="sr-only"
              onChange={handleChange}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
