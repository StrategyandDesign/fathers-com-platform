"use client";

import { useState } from "react";

import { reportSkillUse } from "@/lib/father/actions";
import type { SkillUse } from "@/lib/father/skill-use";
import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";

const CHOICES: Array<{ value: SkillUse; labelKey: string }> = [
  { value: "used", labelKey: "father.session.skillUseCompleted" },
  { value: "later", labelKey: "father.session.skillUseLater" },
  { value: "dismissed", labelKey: "father.session.skillUseDismiss" },
];

export function SkillUseCard({
  sessionId,
  skill,
  reported,
  returnTo,
}: {
  sessionId: string;
  skill: string;
  reported: SkillUse | null;
  returnTo: "home" | "done";
}) {
  const t = useT();
  const [hidden, setHidden] = useState(Boolean(reported));

  if (hidden) return null;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("father.session.skillUseTitle")}</p>
        {skill ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{skill}</p>
        ) : null}
      </div>
      <div className="flex flex-row flex-wrap items-center gap-2">
        {CHOICES.map((choice) => (
          <form
            key={choice.value}
            action={reportSkillUse}
            onSubmit={() => setHidden(true)}
          >
            <input type="hidden" name="session_id" value={sessionId} />
            <input type="hidden" name="skill_use" value={choice.value} />
            <input type="hidden" name="return_to" value={returnTo} />
            <Button type="submit" variant="outline" className="min-h-11">
              {t(choice.labelKey)}
            </Button>
          </form>
        ))}
      </div>
    </section>
  );
}
