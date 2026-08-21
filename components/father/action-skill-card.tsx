import { INTENTION_LABEL_KEYS, INTENTION_OPTIONS, type IntentionOption } from "@/lib/father/action-commitment";
import type { Translate } from "@/lib/i18n/translate";
import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function ActionSkillCard({
  skill,
  eyebrow,
}: {
  skill: string;
  eyebrow?: string | null;
}) {
  return (
    <header className="space-y-3">
      {eyebrow ? <p className="text-sm text-muted-foreground">{eyebrow}</p> : null}
      <h1 className="text-pretty text-[1.65rem] font-medium leading-[1.2] tracking-tight sm:text-[1.85rem]">
        {skill}
      </h1>
    </header>
  );
}

export function ActionIntentionList({
  t,
  name = "intention",
  value,
  onChange,
  interactive = true,
}: {
  t: Translate;
  name?: string;
  value?: IntentionOption | null;
  onChange?: (next: IntentionOption) => void;
  interactive?: boolean;
}) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {INTENTION_OPTIONS.map((option) => {
        const selected = value === option;
        const label = (
          <span className="flex min-h-12 items-center justify-between gap-4 py-1 text-[15px] leading-snug">
            <span className={cn(selected ? "text-foreground" : "text-muted-foreground")}>
              {t(INTENTION_LABEL_KEYS[option])}
            </span>
            <span
              aria-hidden
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                selected ? "bg-primary" : "bg-transparent"
              )}
            />
          </span>
        );

        if (!interactive) {
          return (
            <div key={option} className="px-0">
              {label}
            </div>
          );
        }

        return (
          <label
            key={option}
            className={cn("block cursor-pointer px-0", interactiveControlClassName)}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange?.(option)}
              required
              className="sr-only"
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}

export function ActionIntentionChipPreview({
  t,
  selected,
}: {
  t: Translate;
  selected?: IntentionOption | null;
}) {
  return <ActionIntentionList t={t} value={selected} interactive={false} />;
}
