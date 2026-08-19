import { Button } from "@/components/ui/button";
import type { Translate } from "@/lib/i18n/translate";
import { saveParticipationMode } from "@/lib/manager/actions";
import type { Group } from "@/lib/manager/types";
import { parseParticipationMode } from "@/lib/participation";
import { radioOptionClassName } from "@/lib/ui";

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

export function ParticipationModeCard({
  groups,
  t,
}: {
  groups: Group[];
  t: Translate;
}) {
  if (groups.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="font-heading text-lg font-semibold">
        {t("manager.dashboard.participationTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("manager.dashboard.participationLead")}
      </p>
      <div className="mt-5 space-y-6">
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
    </section>
  );
}
