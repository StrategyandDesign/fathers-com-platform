"use client";

import { useTransition } from "react";

import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { submitSupportReport } from "@/lib/support/actions";
import {
  MESSAGE_MAX_LENGTH,
  PAGE_MAX_LENGTH,
  SUPPORT_CATEGORIES,
} from "@/lib/support/types";
import { fieldClassName, radioOptionClassName, textareaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function SupportReportForm() {
  const [pending, startTransition] = useTransition();
  const t = useT();
  const categoryLabel = {
    bug: t("help.bug"),
    not_working: t("help.notWorking"),
    question: t("help.question"),
    other: t("help.other"),
  } as const;

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
        <legend className="text-sm text-muted-foreground">{t("help.category")}</legend>
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
              <span>{categoryLabel[category]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">{t("help.page")}</span>
        <input
          className={fieldClassName}
          name="page"
          maxLength={PAGE_MAX_LENGTH}
          disabled={pending}
          placeholder={t("help.pagePlaceholder")}
          autoComplete="off"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">{t("help.message")}</span>
        <textarea
          className={textareaClassName}
          name="message"
          required
          maxLength={MESSAGE_MAX_LENGTH}
          disabled={pending}
          rows={6}
          placeholder={t("help.messagePlaceholder")}
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">{t("help.screenshot")}</span>
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
        {pending ? t("common.saving") : t("help.send")}
      </Button>
    </form>
  );
}
