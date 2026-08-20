"use client";

import { useState } from "react";

import { reportSkillUse } from "@/lib/father/actions";
import type { SkillUse } from "@/lib/father/skill-use";
import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";

function skillUseLabels(locale: string) {
  if (locale === "he") {
    return {
      title: "השתמשת במיומנות הזו?",
      completed: "הושלם",
      later: "עדיין לא",
      dismiss: "סגירה",
    };
  }
  return {
    title: "Did you use this skill?",
    completed: "Completed",
    later: "Not yet",
    dismiss: "Dismiss",
  };
}

const CHOICES: Array<{ value: SkillUse; label: "completed" | "later" | "dismiss" }> = [
  { value: "used", label: "completed" },
  { value: "later", label: "later" },
  { value: "dismissed", label: "dismiss" },
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
  const { locale } = useI18n();
  const copy = skillUseLabels(locale);
  const [hidden, setHidden] = useState(Boolean(reported));

  if (hidden) return null;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="space-y-1">
        <p className="text-sm font-medium">{copy.title}</p>
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
              {copy[choice.label]}
            </Button>
          </form>
        ))}
      </div>
    </section>
  );
}
