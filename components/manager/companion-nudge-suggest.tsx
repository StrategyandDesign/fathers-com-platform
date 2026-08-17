"use client";

import { useState } from "react";

import { useT } from "@/components/i18n/locale-provider";
import { NudgeForm } from "@/components/manager/nudge-form";
import { Button } from "@/components/ui/button";
import { translateNudgeTemplate } from "@/lib/i18n/flash";
import type { CompanionCopy, CompanionNudgeBlock } from "@/lib/manager/companion";
import type { NudgeTemplateKey } from "@/lib/manager/nudges";

function copyText(copy: CompanionCopy, t: (key: string, vars?: Record<string, string | number>) => string) {
  return t(copy.key, copy.vars);
}

export function CompanionNudgeSuggest({
  fatherId,
  template,
  reason,
  whyTemplate,
  canNudge,
  block,
  cooldownDays,
  returnTo,
  compact = false,
  defaultOpen = false,
}: {
  fatherId: string;
  template: NudgeTemplateKey;
  reason: CompanionCopy;
  whyTemplate: CompanionCopy;
  canNudge: boolean;
  block: CompanionNudgeBlock;
  cooldownDays: number;
  returnTo?: "list" | "detail" | "dashboard";
  compact?: boolean;
  defaultOpen?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);
  const [dismissed, setDismissed] = useState(false);
  const suggested = translateNudgeTemplate(template, t);

  if (dismissed) return null;

  const blockMessage =
    block === "history"
      ? t("manager.companion.historyFailed")
      : block === "prefs"
        ? t("manager.companion.remindersOff")
        : block === "cooldown"
          ? cooldownDays === 1
            ? t("manager.companion.cooldownTomorrow")
            : t("manager.companion.cooldown", { days: cooldownDays })
          : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{copyText(reason, t)}</p>
      {blockMessage && !open ? (
        <p className="text-sm text-muted-foreground">{blockMessage}</p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        {canNudge && !open ? (
          <Button
            type="button"
            variant={compact ? "outline" : "default"}
            className="w-full sm:w-auto"
            onClick={() => setOpen(true)}
          >
            {t("manager.companion.suggestNudge")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="w-full sm:w-auto"
          onClick={() => setDismissed(true)}
        >
          {t("manager.companion.dismiss")}
        </Button>
      </div>
      {open ? (
        <div className="space-y-3 rounded-lg border border-border bg-black/30 px-4 py-3">
          <p className="text-sm">
            <span className="font-medium text-foreground">{t("manager.companion.suggestedNote")}: </span>
            {suggested.label}
          </p>
          <p className="text-sm text-muted-foreground">{suggested.preview}</p>
          <p className="text-sm text-muted-foreground">{copyText(whyTemplate, t)}</p>
          {blockMessage ? (
            <p className="text-sm text-muted-foreground">{blockMessage}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("manager.companion.youConfirm")}</p>
              <NudgeForm
                fatherId={fatherId}
                defaultTemplate={template}
                returnTo={returnTo}
                compact={compact}
                submitLabel={t("manager.companion.confirmSend")}
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
