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

export type ManagerCohortDeskLeader = {
  id: string;
  name: string;
  staffRole: "manager" | "reviewer";
};

export type ManagerCohortDeskPeer = Pick<
  CohortNote,
  "authorId" | "authorName" | "body" | "updatedAt" | "audienceTrainingId" | "audienceTrainingTitle"
>;

export type ManagerCohortDeskGroup = {
  groupId: string;
  groupName: string;
  fatherCount: number;
  audiences: Array<{
    trainingId: string;
    title: string;
    assignedCount: number;
  }>;
  leaders: ManagerCohortDeskLeader[];
  own: Pick<
    CohortNote,
    "id" | "body" | "updatedAt" | "audienceTrainingId" | "audienceTrainingTitle"
  > | null;
  peers: ManagerCohortDeskPeer[];
};

export function otherLeaderTickers(input: {
  viewerId: string;
  leaders: ManagerCohortDeskLeader[];
  peers: ManagerCohortDeskPeer[];
}) {
  return input.leaders
    .filter((row) => row.staffRole === "manager" && row.id !== input.viewerId)
    .map((leader) => ({
      leader,
      note: input.peers.find((peer) => peer.authorId === leader.id) ?? null,
    }));
}

export type FatherLeader = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export function resolveCohortNoteAuthorName(
  authorId: string | null | undefined,
  names: Array<{ id: string; name: string | null | undefined }>
) {
  if (!authorId) return null;
  const name = names.find((row) => row.id === authorId)?.name?.trim();
  return name || null;
}

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
