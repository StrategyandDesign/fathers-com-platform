import { INTENTION_LABEL_KEYS, INTENTION_OPTIONS } from "@/lib/father/action-commitment";
import type { Translate } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

export function ActionSkillCard({ skill }: { skill: string }) {
  return (
    <p className="rounded-xl border border-border bg-card px-4 py-5 text-center text-lg font-semibold leading-snug sm:px-5 sm:py-6 sm:text-xl">
      {skill}
    </p>
  );
}

export function ActionIntentionChipPreview({ t }: { t: Translate }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {INTENTION_OPTIONS.map((value) => (
        <div
          key={value}
          className={cn(
            "flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-3 text-center text-sm"
          )}
        >
          <span className="min-w-0 leading-snug">{t(INTENTION_LABEL_KEYS[value])}</span>
        </div>
      ))}
    </div>
  );
}
