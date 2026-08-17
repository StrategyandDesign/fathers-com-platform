"use client";

import { useEffect, useState } from "react";

import { CopyButton } from "@/components/manager/copy-button";
import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { textareaClassName } from "@/lib/ui";

export function ReviewerFunderNarrative({ draft }: { draft: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(draft);

  useEffect(() => {
    setText(draft);
  }, [draft]);

  return (
    <section className="rounded-xl border border-primary/35 bg-card p-4 sm:p-6">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
        {t("reviewer.summary.narrativeKicker")}
      </p>
      <h2 className="font-heading mt-2 text-lg font-semibold">
        {t("reviewer.summary.narrativeTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("reviewer.summary.narrativeLead")}
      </p>
      {open ? (
        <div className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">
              {t("reviewer.summary.narrativeHint")}
            </span>
            <textarea
              className={textareaClassName}
              rows={8}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CopyButton
              value={text}
              className="w-full sm:w-auto"
              label={t("reviewer.summary.copyNarrative")}
              copiedLabel={t("reviewer.summary.copiedNarrative")}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setText(draft)}
            >
              {t("reviewer.summary.narrativeReset")}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" className="mt-5 w-full sm:w-auto" onClick={() => setOpen(true)}>
          {t("reviewer.summary.narrativeGenerate")}
        </Button>
      )}
    </section>
  );
}
