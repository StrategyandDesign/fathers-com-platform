import { isTrainingAssignable, type Training } from "@/lib/father/types";
import { listAssignableTrainings } from "@/lib/manager/assignment-status";
import type { OrganizationTrainingReview } from "@/lib/manager/reviews";
import type { ManagerCohortDeskGroup } from "@/lib/cohort-note/types";

export const COHORT_NOTE_AUDIENCE_COHORT = "";

export type CohortNoteAudienceOption = {
  trainingId: string;
  title: string;
  assignedCount: number;
};

export type CohortNoteAudiencePair = {
  fatherId: string;
  trainingId: string;
};

export function parseCohortNoteAudience(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!value || value === "cohort") return null;
  return value;
}

export function canSeeCohortNoteAudience(
  audienceTrainingId: string | null | undefined,
  assignedTrainingIds: Iterable<string>
) {
  if (!audienceTrainingId) return true;
  const assigned =
    assignedTrainingIds instanceof Set
      ? assignedTrainingIds
      : new Set(assignedTrainingIds);
  return assigned.has(audienceTrainingId);
}

export function fatherIdsForCohortNoteAudience(input: {
  audienceTrainingId: string | null | undefined;
  memberIds: string[];
  assignedPairs: CohortNoteAudiencePair[];
}) {
  const members = [...new Set(input.memberIds)];
  if (!input.audienceTrainingId) return members;
  const allowed = new Set(
    input.assignedPairs
      .filter((row) => row.trainingId === input.audienceTrainingId)
      .map((row) => row.fatherId)
  );
  return members.filter((id) => allowed.has(id));
}

export function isCohortNoteAudienceAllowed(input: {
  training: Pick<
    Training,
    "published" | "released_at" | "first_published_at" | "first_released_at"
  > | null;
  reviewStatus: string | null | undefined;
}) {
  if (!input.training) return false;
  return isTrainingAssignable(input.training, input.reviewStatus);
}

export function listCohortNoteAudienceOptions(input: {
  trainings: Array<
    Pick<
      Training,
      | "id"
      | "title"
      | "order_index"
      | "published"
      | "released_at"
      | "first_published_at"
      | "first_released_at"
    >
  >;
  reviews: Array<Pick<OrganizationTrainingReview, "group_id" | "training_id" | "status">>;
  groupId: string;
  memberIds: string[];
  assignedPairs: CohortNoteAudiencePair[];
  keepTrainingIds?: Array<string | null | undefined>;
}): CohortNoteAudienceOption[] {
  const listed = listAssignableTrainings({
    trainings: input.trainings,
    groups: [{ id: input.groupId }],
    reviews: input.reviews,
  }).map((training) => ({
    trainingId: training.id,
    title: training.title,
    assignedCount: fatherIdsForCohortNoteAudience({
      audienceTrainingId: training.id,
      memberIds: input.memberIds,
      assignedPairs: input.assignedPairs,
    }).length,
  }));

  for (const keepTrainingId of input.keepTrainingIds ?? []) {
    if (!keepTrainingId || listed.some((row) => row.trainingId === keepTrainingId)) {
      continue;
    }
    const kept = input.trainings.find((row) => row.id === keepTrainingId);
    if (!kept) continue;
    listed.push({
      trainingId: kept.id,
      title: kept.title,
      assignedCount: fatherIdsForCohortNoteAudience({
        audienceTrainingId: kept.id,
        memberIds: input.memberIds,
        assignedPairs: input.assignedPairs,
      }).length,
    });
  }

  return listed;
}

export function decorateCohortNoteDesk(
  groups: ManagerCohortDeskGroup[],
  input: {
    trainings: Array<
      Pick<
        Training,
        | "id"
        | "title"
        | "order_index"
        | "published"
        | "released_at"
        | "first_published_at"
        | "first_released_at"
      >
    >;
    reviews: Array<Pick<OrganizationTrainingReview, "group_id" | "training_id" | "status">>;
    participants: Array<{ fatherId: string; groupId: string }>;
    assignments: Array<{ father_id: string; training_id: string }>;
  }
): ManagerCohortDeskGroup[] {
  const titles = new Map(input.trainings.map((row) => [row.id, row.title]));
  const assignedPairs = input.assignments.map((row) => ({
    fatherId: row.father_id,
    trainingId: row.training_id,
  }));

  return groups.map((group) => {
    const memberIds = input.participants
      .filter((row) => row.groupId === group.groupId)
      .map((row) => row.fatherId);
    const audiences = listCohortNoteAudienceOptions({
      trainings: input.trainings,
      reviews: input.reviews,
      groupId: group.groupId,
      memberIds,
      assignedPairs,
      keepTrainingIds: [
        group.own?.audienceTrainingId,
        ...group.peers.map((peer) => peer.audienceTrainingId),
      ],
    });

    const titleFor = (trainingId: string | null | undefined) =>
      trainingId ? titles.get(trainingId) ?? null : null;

    return {
      ...group,
      fatherCount: memberIds.length,
      audiences,
      own: group.own
        ? {
            ...group.own,
            audienceTrainingTitle: titleFor(group.own.audienceTrainingId),
          }
        : null,
      peers: group.peers.map((peer) => ({
        ...peer,
        audienceTrainingTitle: titleFor(peer.audienceTrainingId),
      })),
    };
  });
}
