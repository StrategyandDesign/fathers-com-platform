"use client";

import { useState } from "react";

import { CohortNoteMessage } from "@/components/cohort-note/message";
import { clearCohortNote, publishCohortNote } from "@/lib/cohort-note/actions";
import { COHORT_NOTE_AUDIENCE_COHORT } from "@/lib/cohort-note/audience";
import { COHORT_NOTE_MAX, normalizeCohortNote, type ManagerCohortDeskGroup } from "@/lib/cohort-note/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/locale-provider";
import { formatShortDateTime } from "@/lib/i18n/dates";
import { fieldClassName, textareaClassName } from "@/lib/ui";

export function CohortNoteDesk({
  groups,
}: {
  groups: ManagerCohortDeskGroup[];
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
  group: ManagerCohortDeskGroup;
  showGroupName: boolean;
}) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState("");
  const [audienceId, setAudienceId] = useState(
    group.own?.audienceTrainingId ?? COHORT_NOTE_AUDIENCE_COHORT
  );
  const liveBody = normalizeCohortNote(group.own?.body ?? "");
  const preview = normalizeCohortNote(draft);
  const liveStamp = group.own?.updatedAt
    ? formatShortDateTime(group.own.updatedAt, locale)
    : null;
  const selectedAudience = group.audiences.find((row) => row.trainingId === audienceId);
  const audienceHint = selectedAudience
    ? t("manager.dashboard.noteAudienceTrainingHint", {
        title: selectedAudience.title,
        n: selectedAudience.assignedCount,
      })
    : t("manager.dashboard.noteAudienceCohortHint", { n: group.fatherCount });

  return (
    <div className="space-y-4">
      {showGroupName ? <p className="text-sm font-medium">{group.groupName}</p> : null}

      {group.peers.length > 0 ? (
        <div className="space-y-3">
          {group.peers.map((peer) => (
            <div
              key={`${peer.authorId}-${peer.updatedAt}`}
              className="rounded-xl border border-border bg-black/20 p-4"
            >
              <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
                {t("manager.dashboard.notePeerShowing", {
                  name: peer.authorName ?? t("role.leader"),
                })}
              </p>
              <div className="mt-2">
                <CohortNoteMessage
                  body={peer.body}
                  stamp={formatShortDateTime(peer.updatedAt, locale)}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {peer.audienceTrainingTitle
                  ? t("manager.dashboard.noteAudienceShowingTraining", {
                      title: peer.audienceTrainingTitle,
                    })
                  : t("manager.dashboard.noteAudienceShowingCohort")}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {liveBody ? (
        <div className="rounded-xl border border-border bg-black/20 p-4">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
            {t("manager.dashboard.noteNowShowing")}
          </p>
          <div className="mt-2">
            <CohortNoteMessage body={liveBody} stamp={liveStamp} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {group.own?.audienceTrainingTitle
              ? t("manager.dashboard.noteAudienceShowingTraining", {
                  title: group.own.audienceTrainingTitle,
                })
              : t("manager.dashboard.noteAudienceShowingCohort")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.dashboard.noteOneAtATime")}
          </p>
        </div>
      ) : null}

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
              n: preview.length,
              max: COHORT_NOTE_MAX,
            })}
          </span>
        </label>
        {group.audiences.length > 0 ? (
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">
              {t("manager.dashboard.noteAudience")}
            </span>
            <select
              className={fieldClassName}
              name="audience_training_id"
              value={audienceId}
              onChange={(event) => setAudienceId(event.target.value)}
            >
              <option value={COHORT_NOTE_AUDIENCE_COHORT}>
                {t("manager.dashboard.noteAudienceCohort")}
              </option>
              {group.audiences.map((row) => (
                <option key={row.trainingId} value={row.trainingId}>
                  {row.title}
                </option>
              ))}
            </select>
            <span className="block text-sm text-muted-foreground">{audienceHint}</span>
          </label>
        ) : null}
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
