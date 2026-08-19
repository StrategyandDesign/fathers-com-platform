"use client";

import { useState } from "react";

import { CohortNoteMessage } from "@/components/cohort-note/message";
import { clearCohortNote, publishCohortNote } from "@/lib/cohort-note/actions";
import { COHORT_NOTE_MAX, normalizeCohortNote } from "@/lib/cohort-note/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/locale-provider";
import { formatShortDateTime } from "@/lib/i18n/dates";
import { textareaClassName } from "@/lib/ui";

type CohortNoteGroup = {
  groupId: string;
  groupName: string;
  body: string;
  updatedAt: string | null;
};

export function CohortNoteDesk({
  groups,
}: {
  groups: CohortNoteGroup[];
}) {
  const { t } = useI18n();
  if (groups.length === 0) return null;

  return (
    <section id="update" className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div>
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
          {t("manager.dashboard.noteEyebrow")}
        </p>
        <h2 className="font-heading mt-2 text-lg font-semibold">
          {t("manager.dashboard.noteTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {groups.length > 1
            ? t("manager.dashboard.noteLeadMany")
            : t("manager.dashboard.noteLead")}
        </p>
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
  group: CohortNoteGroup;
  showGroupName: boolean;
}) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState("");
  const liveBody = normalizeCohortNote(group.body);
  const draftCount = normalizeCohortNote(draft).length;
  const liveStamp = group.updatedAt ? formatShortDateTime(group.updatedAt, locale) : null;

  return (
    <div className="space-y-4">
      {showGroupName ? <p className="text-sm font-medium">{group.groupName}</p> : null}

      {liveBody ? (
        <div className="rounded-xl border border-border bg-black/20 p-4">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
            {t("manager.dashboard.noteNowShowing")}
          </p>
          <div className="mt-2">
            <CohortNoteMessage body={liveBody} stamp={liveStamp} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("manager.dashboard.noteOneAtATime")}
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-black/30 px-4 py-3 text-sm text-muted-foreground">
          {t("manager.dashboard.notePreviewEmpty")}
        </p>
      )}

      <form action={publishCohortNote} className="space-y-3">
        <input type="hidden" name="group_id" value={group.groupId} />
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">
            {liveBody
              ? t("manager.dashboard.noteReplaceLabel")
              : t("manager.dashboard.noteLabel")}
          </span>
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
              n: draftCount,
              max: COHORT_NOTE_MAX,
            })}
          </span>
        </label>
        <Button type="submit" className="w-full sm:w-auto">
          {liveBody ? t("manager.dashboard.noteReplace") : t("manager.dashboard.notePost")}
        </Button>
      </form>
      {liveBody ? (
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
