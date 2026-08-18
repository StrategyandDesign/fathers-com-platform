import { CohortNoteMessage } from "@/components/cohort-note/message";
import { dismissCohortNote } from "@/lib/cohort-note/actions";
import { Button } from "@/components/ui/button";
import { formatShortDateTime } from "@/lib/i18n/dates";
import type { Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/translate";

export function CohortNoteCard({
  groupId,
  body,
  updatedAt,
  locale,
  t,
}: {
  groupId: string;
  body: string;
  updatedAt: string;
  locale: Locale;
  t: Translate;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
            {t("father.home.noteEyebrow")}
          </p>
          <CohortNoteMessage body={body} stamp={formatShortDateTime(updatedAt, locale)} />
        </div>
        <form action={dismissCohortNote} className="shrink-0">
          <input type="hidden" name="group_id" value={groupId} />
          <Button type="submit" variant="outline" size="sm">
            {t("father.home.noteDismiss")}
          </Button>
        </form>
      </div>
    </section>
  );
}
