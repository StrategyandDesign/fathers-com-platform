export const COHORT_NOTE_MAX = 280;

export type CohortNote = {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string | null;
  body: string;
  updatedAt: string;
  audienceTrainingId?: string | null;
  audienceTrainingTitle?: string | null;
};

export type ManagerCohortDeskGroup = {
  groupId: string;
  groupName: string;
  fatherCount: number;
  audiences: Array<{
    trainingId: string;
    title: string;
    assignedCount: number;
  }>;
  own: Pick<
    CohortNote,
    "id" | "body" | "updatedAt" | "audienceTrainingId" | "audienceTrainingTitle"
  > | null;
  peers: Array<
    Pick<
      CohortNote,
      "authorId" | "authorName" | "body" | "updatedAt" | "audienceTrainingId" | "audienceTrainingTitle"
    >
  >;
};

export type FatherLeader = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export function normalizeCohortNote(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

export function composeCohortNoteParts(
  body: string,
  stamp: string | null | undefined
) {
  const text = normalizeCohortNote(body);
  const time = stamp?.trim() && stamp !== "—" ? stamp.trim() : null;
  return { stamp: time, body: text };
}

export function isCohortNoteVisible(
  noteUpdatedAt: string,
  dismissedAt: string | null | undefined
) {
  if (!dismissedAt) return true;
  const updated = Date.parse(noteUpdatedAt);
  const dismissed = Date.parse(dismissedAt);
  if (Number.isNaN(updated)) return false;
  if (Number.isNaN(dismissed)) return true;
  return updated > dismissed;
}
