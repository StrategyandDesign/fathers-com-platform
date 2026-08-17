"use client";

import { useState, type MouseEvent } from "react";
import { useFormStatus } from "react-dom";

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
  return (
    <fieldset className="mt-8">
      <legend className="sr-only">Answer</legend>
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
  const { pending } = useFormStatus();
  const [advancing, setAdvancing] = useState(false);
  const locked = pending || advancing;

  function handleClick(event: MouseEvent<HTMLInputElement>) {
    if (!autoAdvance || locked) return;
    const form = event.currentTarget.form;
    if (!form) return;

    setAdvancing(true);
    const nextButton = form.querySelector<HTMLButtonElement>("[data-profile-advance]");
    requestAnimationFrame(() => {
      form.requestSubmit(nextButton ?? undefined);
    });
  }

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
            onClick={handleClick}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
