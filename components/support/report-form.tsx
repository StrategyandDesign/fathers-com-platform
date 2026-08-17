"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { submitSupportReport } from "@/lib/support/actions";
import {
  MESSAGE_MAX_LENGTH,
  PAGE_MAX_LENGTH,
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABEL,
} from "@/lib/support/types";
import { fieldClassName, radioOptionClassName, textareaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function SupportReportForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(() => {
          void submitSupportReport(formData);
        });
      }}
      className="space-y-5"
      aria-busy={pending}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm text-muted-foreground">Category</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SUPPORT_CATEGORIES.map((category) => (
            <label key={category} className={radioOptionClassName}>
              <input
                type="radio"
                name="category"
                value={category}
                required
                disabled={pending}
                defaultChecked={category === "not_working"}
                className="size-4 accent-primary"
              />
              <span>{SUPPORT_CATEGORY_LABEL[category]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">Page or feature (optional)</span>
        <input
          className={fieldClassName}
          name="page"
          maxLength={PAGE_MAX_LENGTH}
          disabled={pending}
          placeholder="Home, a training, Account…"
          autoComplete="off"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">Message</span>
        <textarea
          className={textareaClassName}
          name="message"
          required
          maxLength={MESSAGE_MAX_LENGTH}
          disabled={pending}
          rows={6}
          placeholder="What went wrong, or what you need help with."
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">Screenshot (optional)</span>
        <input
          className={cn(
            fieldClassName,
            "h-auto cursor-pointer py-2 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground"
          )}
          type="file"
          name="screenshot"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
        />
        <span className="block text-xs text-muted-foreground">
          JPEG, PNG, or WebP. 2 MB max.
        </span>
      </label>

      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Sending…" : "Send report"}
      </Button>
    </form>
  );
}
