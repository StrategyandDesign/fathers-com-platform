import { ProgressBar } from "@/components/ui/progress";
import { translateThemeLabel } from "@/lib/i18n/flash";
import { getI18n } from "@/lib/i18n/server";
import { PROFILE_THEMES } from "@/lib/profile/questions";
import { cn } from "@/lib/utils";

export async function DimensionScores({
  scores,
  className,
}: {
  scores: Record<string, number>;
  className?: string;
}) {
  const { t } = await getI18n();
  const groups = [
    { title: t("father.profile.edges"), items: PROFILE_THEMES.filter((theme) => theme.kind === "edge") },
    {
      title: t("father.profile.determinations"),
      items: PROFILE_THEMES.filter((theme) => theme.kind === "determination"),
    },
  ];

  return (
    <div className={cn("mt-8 space-y-6", className)}>
      {groups.map((group) => (
        <div key={group.title}>
          <p className="text-sm font-medium">{group.title}</p>
          <ul className="mt-3 space-y-3">
            {group.items.map((theme) => {
              const value = scores[theme.key] ?? 0;
              return (
                <li key={theme.key}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{translateThemeLabel(theme.label, t)}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round(value)}</span>
                  </div>
                  <ProgressBar value={value} className="mt-1.5" />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
