import { Button } from "@/components/ui/button";
import type { Translate } from "@/lib/i18n/translate";
import { dismissStaffMessage } from "@/lib/staff-messages/actions";
import type { StaffRibbonMessage } from "@/lib/staff-messages/types";

export function StaffMessageRibbon({
  messages,
  t,
}: {
  messages: StaffRibbonMessage[];
  t: Translate;
}) {
  const current = messages[0];
  if (!current) return null;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
          {t("staff.ribbon.eyebrow")}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{current.body}</p>
      </div>
      <form action={dismissStaffMessage} className="shrink-0">
        <input type="hidden" name="message_id" value={current.id} />
        <Button type="submit" variant="outline" size="sm">
          {t("staff.ribbon.dismiss")}
        </Button>
      </form>
    </div>
  );
}
