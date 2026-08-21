import { formatShortDateTime } from "@/lib/i18n/dates";
import type { Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/translate";
import { activityCopyKey, type OrganizationActivityRow } from "@/lib/org-staff/types";

export function ActivityTicker({
  items,
  viewerId,
  showGroupName,
  locale,
  t,
}: {
  items: OrganizationActivityRow[];
  viewerId: string;
  showGroupName?: boolean;
  locale: Locale;
  t: Translate;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
        {t("manager.dashboard.activityEyebrow")}
      </p>
      <h2 className="font-heading mt-2 text-lg font-semibold">
        {t("manager.dashboard.activityTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("manager.dashboard.activityLead")}
      </p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("manager.dashboard.activityEmpty")}
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {items.map((item) => {
            const actor =
              item.actorId === viewerId ? t("manager.dashboard.activityYou") : item.actorName;
            const name =
              typeof item.payload.name === "string" ? item.payload.name : t("role.leader");
            const role =
              item.payload.staffRole === "reviewer" ? t("role.reviewer") : t("role.leader");
            return (
              <li key={item.id} className="px-4 py-3">
                <p className="text-sm">
                  <span className="font-medium">{actor}</span>{" "}
                  {t(activityCopyKey(item.kind), { name, role })}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {showGroupName ? `${item.groupName} · ` : null}
                  {formatShortDateTime(item.createdAt, locale)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
