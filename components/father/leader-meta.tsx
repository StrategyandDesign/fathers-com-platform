import { UserAvatar } from "@/components/layout/user-avatar";
import { formatLeaderNames } from "@/lib/org-staff/types";
import type { FatherLeader } from "@/lib/cohort-note/types";
import type { Translate } from "@/lib/i18n/translate";

export function LeaderMeta({
  name,
  avatarUrl,
  leaders,
  t,
}: {
  name?: string;
  avatarUrl?: string | null;
  leaders?: FatherLeader[];
  t: Translate;
}) {
  const people =
    leaders && leaders.length > 0
      ? leaders
      : name
        ? [{ id: "leader", name, avatarUrl: avatarUrl ?? null }]
        : [];
  if (people.length === 0) return null;

  const names = formatLeaderNames(people.map((person) => person.name));
  const label =
    people.length > 1
      ? t("father.home.leadersLabel", { names })
      : t("father.home.leaderLabel", { name: people[0].name });

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="flex -space-x-1.5">
        {people.slice(0, 3).map((person) => (
          <UserAvatar
            key={person.id}
            name={person.name}
            src={person.avatarUrl}
            className="size-6 text-[10px] ring-2 ring-background"
          />
        ))}
      </span>
      <span>{label}</span>
    </p>
  );
}
