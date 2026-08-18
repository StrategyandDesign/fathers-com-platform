import { UserAvatar } from "@/components/layout/user-avatar";
import type { Translate } from "@/lib/i18n/translate";

export function LeaderMeta({
  name,
  avatarUrl,
  t,
}: {
  name: string;
  avatarUrl?: string | null;
  t: Translate;
}) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <UserAvatar name={name} src={avatarUrl} className="size-6 text-[10px]" />
      <span>{t("father.home.leaderLabel", { name })}</span>
    </p>
  );
}
