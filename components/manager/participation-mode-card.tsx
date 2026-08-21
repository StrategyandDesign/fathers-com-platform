import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Translate } from "@/lib/i18n/translate";
import { saveParticipationMode } from "@/lib/manager/actions";
import type { Group } from "@/lib/manager/types";
import { parseParticipationMode } from "@/lib/participation";
import { interactiveControlClassName, radioOptionClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    value: "unset",
    label: "manager.dashboard.participationUnset",
    hint: "manager.dashboard.participationUnsetHint",
  },
  {
    value: "expected",
    label: "manager.dashboard.participationExpected",
    hint: "manager.dashboard.participationExpectedHint",
  },
  {
    value: "open",
    label: "manager.dashboard.participationOpen",
    hint: "manager.dashboard.participationOpenHint",
  },
] as const;

function modeLabel(mode: string, t: Translate) {
  const option = OPTIONS.find((row) => row.value === mode) ?? OPTIONS[0];
  return t(option.label);
}

export function ParticipationModeCard({
  groups,
  t,
}: {
  groups: Group[];
  t: Translate;
}) {
  if (groups.length === 0) return null;

  const summary = groups
    .map((group) => {
      const label = modeLabel(parseParticipationMode(group.participation_mode), t);
      return groups.length > 1 ? `${group.name}: ${label}` : label;
    })
    .join(" · ");

  return (
    <details className="group overflow-hidden rounded-xl border border-border bg-card open:[&_svg]:rotate-180">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-6",
          interactiveControlClassName,
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold">
            {t("manager.dashboard.participationTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        </div>
        <ChevronDown
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground transition-transform duration-150"
        />
      </summary>
      <div className="space-y-6 border-t border-border px-4 py-5 sm:px-6 sm:pb-6">
        <p className="text-sm text-muted-foreground">
          {t("manager.dashboard.participationLead")}
        </p>
        {groups.map((group) => {
          const current = parseParticipationMode(group.participation_mode);
          return (
            <form key={group.id} action={saveParticipationMode} className="space-y-3">
              <input type="hidden" name="group_id" value={group.id} />
              {groups.length > 1 ? (
                <p className="text-sm font-medium">{group.name}</p>
              ) : null}
              <fieldset className="space-y-3">
                <legend className="sr-only">{t("manager.dashboard.participationTitle")}</legend>
                {OPTIONS.map((option) => (
                  <label key={option.value} className={radioOptionClassName}>
                    <input
                      type="radio"
                      name="participation_mode"
                      value={option.value}
                      defaultChecked={current === option.value}
                      required
                      className="size-4 accent-primary"
                    />
                    <span>
                      <span className="block font-medium">{t(option.label)}</span>
                      <span className="block text-sm text-muted-foreground">{t(option.hint)}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                {t("manager.dashboard.participationSave")}
              </Button>
            </form>
          );
        })}
      </div>
    </details>
  );
}
