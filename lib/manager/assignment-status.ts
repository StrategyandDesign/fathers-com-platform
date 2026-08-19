import { isTrainingAssignable } from "@/lib/father/types";
import type { OrganizationTrainingReview } from "@/lib/manager/reviews";
import type { TrainingProgress } from "@/lib/manager/types";

export const ASSIGNMENT_CELL_STATUSES = [
  "unassigned",
  "not_started",
  "in_progress",
  "completed",
] as const;

export type AssignmentCellStatus = (typeof ASSIGNMENT_CELL_STATUSES)[number];

export type AssignmentStatusCard = {
  assigned: boolean;
  completed: number;
  total: number;
};

export type AssignableTrainingRef = {
  id: string;
  title: string;
  order_index: number;
  published?: boolean | null;
  released_at?: string | null;
  first_published_at?: string | null;
  first_released_at?: string | null;
};

export type AssignmentParticipantRef = {
  fatherId: string;
  name: string;
  groupId: string;
  groupName: string;
};

export type AssignmentReviewRef = Pick<
  OrganizationTrainingReview,
  "group_id" | "training_id" | "status"
>;

export type CohortTrainingStatus = {
  trainingId: string;
  title: string;
  total: number;
  assigned: number;
  remaining: number;
  unassigned: number;
  notStarted: number;
  inProgress: number;
  completed: number;
};

export type AssignmentBoardCell = {
  trainingId: string;
  status: AssignmentCellStatus;
  completed: number;
  total: number;
  canAssign: boolean;
};

export type AssignmentBoardRow = {
  fatherId: string;
  name: string;
  groupName: string;
  cells: AssignmentBoardCell[];
};

export type AssignmentBoardColumn = {
  trainingId: string;
  title: string;
  remaining: number;
};

export type AssignmentBoard = {
  columns: AssignmentBoardColumn[];
  rows: AssignmentBoardRow[];
};

export function assignmentCellStatus(
  card?: AssignmentStatusCard | null
): AssignmentCellStatus {
  if (!card?.assigned) return "unassigned";
  if (card.total > 0 && card.completed >= card.total) return "completed";
  if (card.completed > 0) return "in_progress";
  return "not_started";
}

export function reviewStatusForGroup(
  reviews: AssignmentReviewRef[],
  groupId: string,
  trainingId: string
) {
  return (
    reviews.find((row) => row.group_id === groupId && row.training_id === trainingId)?.status ??
    null
  );
}

export function canAssignTrainingToGroup(
  training: AssignableTrainingRef,
  reviews: AssignmentReviewRef[],
  groupId: string
) {
  return isTrainingAssignable(training, reviewStatusForGroup(reviews, groupId, training.id));
}

export function listAssignableTrainings(input: {
  trainings: AssignableTrainingRef[];
  groups: Array<{ id: string }>;
  reviews: AssignmentReviewRef[];
}): AssignableTrainingRef[] {
  return input.trainings
    .filter((training) =>
      input.groups.some((group) => canAssignTrainingToGroup(training, input.reviews, group.id))
    )
    .slice()
    .sort((left, right) => {
      const order = left.order_index - right.order_index;
      if (order !== 0) return order;
      return left.title.localeCompare(right.title);
    });
}

function cardForTraining(cards: TrainingProgress[], trainingId: string) {
  return cards.find((card) => card.training.id === trainingId) ?? null;
}

export function summarizeAssignmentStatus(input: {
  training: AssignableTrainingRef;
  participants: AssignmentParticipantRef[];
  reviews: AssignmentReviewRef[];
  progressFor: (fatherId: string) => TrainingProgress[];
  groupId?: string;
}): CohortTrainingStatus {
  const scoped = input.participants.filter((participant) =>
    input.groupId ? participant.groupId === input.groupId : true
  );

  const counts: Record<AssignmentCellStatus, number> = {
    unassigned: 0,
    not_started: 0,
    in_progress: 0,
    completed: 0,
  };
  let total = 0;

  for (const participant of scoped) {
    const card = cardForTraining(input.progressFor(participant.fatherId), input.training.id);
    const status = assignmentCellStatus(card);
    const visible =
      status !== "unassigned" ||
      canAssignTrainingToGroup(input.training, input.reviews, participant.groupId);
    if (!visible) continue;
    total += 1;
    counts[status] += 1;
  }

  return {
    trainingId: input.training.id,
    title: input.training.title,
    total,
    assigned: total - counts.unassigned,
    remaining: counts.unassigned,
    unassigned: counts.unassigned,
    notStarted: counts.not_started,
    inProgress: counts.in_progress,
    completed: counts.completed,
  };
}

export function buildAssignmentBoard(input: {
  trainings: AssignableTrainingRef[];
  participants: AssignmentParticipantRef[];
  reviews: AssignmentReviewRef[];
  groups: Array<{ id: string }>;
  progressFor: (fatherId: string) => TrainingProgress[];
}): AssignmentBoard {
  const trainings = listAssignableTrainings(input);
  const columns = trainings.map((training) => ({
    trainingId: training.id,
    title: training.title,
    remaining: summarizeAssignmentStatus({
      training,
      participants: input.participants,
      reviews: input.reviews,
      progressFor: input.progressFor,
    }).remaining,
  }));

  const rows = input.participants.map((participant) => ({
    fatherId: participant.fatherId,
    name: participant.name,
    groupName: participant.groupName,
    cells: trainings.map((training) => {
      const card = cardForTraining(input.progressFor(participant.fatherId), training.id);
      const status = assignmentCellStatus(card);
      return {
        trainingId: training.id,
        status,
        completed: card?.completed ?? 0,
        total: card?.total ?? 0,
        canAssign:
          status === "unassigned" &&
          canAssignTrainingToGroup(training, input.reviews, participant.groupId),
      };
    }),
  }));

  return { columns, rows };
}
