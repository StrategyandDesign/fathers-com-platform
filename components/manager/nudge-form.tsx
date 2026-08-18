"use client";

import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { translateNudgeTemplate } from "@/lib/i18n/flash";
import { sendNudge } from "@/lib/manager/nudge-actions";
import {
  NUDGE_TEMPLATES,
  type NudgeTemplateKey,
} from "@/lib/manager/nudges";
import { fieldClassName } from "@/lib/ui";

export function NudgeForm({
  fatherId,
  defaultTemplate = "continue",
  returnTo,
  compact = false,
  submitLabel,
}: {
  fatherId: string;
  defaultTemplate?: NudgeTemplateKey;
  returnTo?: "list" | "detail" | "dashboard";
  compact?: boolean;
  submitLabel?: string;
}) {
  const t = useT();
  return (
    <form action={sendNudge} className={compact ? "flex flex-col gap-2 sm:flex-row" : "space-y-4"}>
      <input type="hidden" name="father_id" value={fatherId} />
      {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
      {compact ? (
        <input type="hidden" name="template" value={defaultTemplate} />
      ) : (
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">{t("manager.nudge.note")}</span>
          <select
            className={fieldClassName}
            name="template"
            defaultValue={defaultTemplate}
            required
          >
            {NUDGE_TEMPLATES.map((key) => (
              <option key={key} value={key}>
                {translateNudgeTemplate(key, t).label}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button type="submit" variant={compact ? "outline" : "default"} className="w-full sm:w-auto">
        {submitLabel ??
          (compact ? t("manager.nudge.sendReminder") : t("manager.nudge.sendNudge"))}
      </Button>
    </form>
  );
}
