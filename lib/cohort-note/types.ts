export const COHORT_NOTE_MAX = 280;

export type CohortNote = {
  groupId: string;
  body: string;
  updatedAt: string;
};

export type FatherLeader = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export function normalizeCohortNote(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
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
