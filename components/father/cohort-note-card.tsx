import { dismissCohortNote } from "@/lib/cohort-note/actions";
import { Button } from "@/components/ui/button";
import type { Translate } from "@/lib/i18n/translate";

export function CohortNoteCard({
  groupId,
  body,
  t,
}: {
  groupId: string;
  body: string;
  t: Translate;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
            {t("father.home.noteEyebrow")}
          </p>
          <p className="text-sm leading-relaxed sm:text-base">{body}</p>
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
