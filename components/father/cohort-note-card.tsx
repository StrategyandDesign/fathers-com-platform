import { CohortNoteMessage } from "@/components/cohort-note/message";
import { dismissCohortNote } from "@/lib/cohort-note/actions";
import { Button } from "@/components/ui/button";
import { formatShortDateTime } from "@/lib/i18n/dates";
import type { Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/translate";

export function CohortNoteCard({
  noteId,
  groupId,
  authorName,
  body,
  updatedAt,
  locale,
  t,
}: {
  noteId?: string;
  groupId: string;
  authorName?: string | null;
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
            {authorName
              ? t("father.home.noteEyebrowFrom", { name: authorName })
              : t("father.home.noteEyebrow")}
          </p>
          <CohortNoteMessage body={body} stamp={formatShortDateTime(updatedAt, locale)} />
        </div>
        <form action={dismissCohortNote} className="shrink-0">
          {noteId ? <input type="hidden" name="note_id" value={noteId} /> : null}
          <input type="hidden" name="group_id" value={groupId} />
          <Button type="submit" variant="outline" size="sm">
            {t("father.home.noteDismiss")}
          </Button>
        </form>
      </div>
    </section>
  );
}

export function CohortNoteStack({
  notes,
  locale,
  t,
}: {
  notes: Array<{
    id: string;
    groupId: string;
    authorName: string | null;
    body: string;
    updatedAt: string;
  }>;
  locale: Locale;
  t: Translate;
}) {
  if (notes.length === 0) return null;
  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <CohortNoteCard
          key={note.id}
          noteId={note.id}
          groupId={note.groupId}
          authorName={note.authorName}
          body={note.body}
          updatedAt={note.updatedAt}
          locale={locale}
          t={t}
        />
      ))}
    </div>
  );
}
