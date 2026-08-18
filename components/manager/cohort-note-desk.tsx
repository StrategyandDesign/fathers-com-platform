"use client";

import { useState } from "react";

import { clearCohortNote, publishCohortNote } from "@/lib/cohort-note/actions";
import { COHORT_NOTE_MAX, normalizeCohortNote } from "@/lib/cohort-note/types";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/locale-provider";
import { textareaClassName } from "@/lib/ui";

export function CohortNoteDesk({
  groups,
}: {
  groups: Array<{
    groupId: string;
    groupName: string;
    body: string;
  }>;
}) {
  const t = useT();
  if (groups.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div>
        <h2 className="font-heading text-lg font-semibold">{t("manager.dashboard.noteTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("manager.dashboard.noteLead")}</p>
      </div>
      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <CohortNoteEditor
            key={group.groupId}
            group={group}
            showGroupName={groups.length > 1}
          />
        ))}
      </div>
    </section>
  );
}

function CohortNoteEditor({
  group,
  showGroupName,
}: {
  group: { groupId: string; groupName: string; body: string };
  showGroupName: boolean;
}) {
  const t = useT();
  const [draft, setDraft] = useState(group.body);
  const preview = normalizeCohortNote(draft);

  return (
    <div className="space-y-4">
      {showGroupName ? <p className="text-sm font-medium">{group.groupName}</p> : null}
      <form action={publishCohortNote} className="space-y-3">
        <input type="hidden" name="group_id" value={group.groupId} />
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">{t("manager.dashboard.noteLabel")}</span>
          <textarea
            className={textareaClassName}
            name="body"
            maxLength={COHORT_NOTE_MAX}
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <span className="block text-xs text-muted-foreground">
            {t("manager.dashboard.noteCount", {
              n: preview.length,
              max: COHORT_NOTE_MAX,
            })}
          </span>
        </label>
        <div className="rounded-xl border border-border bg-black/20 p-4">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
            {preview
              ? t("father.home.noteEyebrow")
              : t("manager.dashboard.notePreview")}
          </p>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">
            {preview || t("manager.dashboard.notePreviewEmpty")}
          </p>
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          {group.body ? t("manager.dashboard.noteReplace") : t("manager.dashboard.notePost")}
        </Button>
      </form>
      {group.body ? (
        <form action={clearCohortNote}>
          <input type="hidden" name="group_id" value={group.groupId} />
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            {t("manager.dashboard.noteClear")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
