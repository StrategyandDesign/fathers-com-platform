import { ProgressBar } from "@/components/ui/progress";
import { PROFILE_THEMES } from "@/lib/profile/questions";
import { cn } from "@/lib/utils";

export function DimensionScores({
  scores,
  className,
}: {
  scores: Record<string, number>;
  className?: string;
}) {
  const groups = [
    { title: "Edges", items: PROFILE_THEMES.filter((theme) => theme.kind === "edge") },
    {
      title: "Determinations",
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
                    <span>{theme.label}</span>
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
