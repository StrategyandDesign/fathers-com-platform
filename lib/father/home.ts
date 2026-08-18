import type { FatherAssignmentCard } from "@/lib/assessments/types";
import type { ProfileDraft } from "@/lib/father/profile";
import type { FatherProfileSummary } from "@/lib/father/types";

export type HomePathCard = {
  training: { id: string };
  completed: number;
  total: number;
  gated: boolean;
};

export type HomeAssessment =
  | { kind: "custom"; card: FatherAssignmentCard }
  | { kind: "keystone-draft"; draft: ProfileDraft }
  | { kind: "keystone-result"; profile: FatherProfileSummary };

export function sortHomePath<T extends HomePathCard>(
  cards: T[],
  currentTrainingId?: string | null
) {
  return [...cards].sort((left, right) => {
    const rank = (card: T) => {
      if (currentTrainingId && card.training.id === currentTrainingId) return 0;
      if (card.gated) return 3;
      if (card.total > 0 && card.completed >= card.total) return 2;
      return 1;
    };
    const delta = rank(left) - rank(right);
    if (delta !== 0) return delta;
    return 0;
  });
}

export function pickHomeAssessment(input: {
  assignments: FatherAssignmentCard[];
  profile: FatherProfileSummary | null;
  draft: ProfileDraft | null;
}): HomeAssessment | null {
  const due = input.assignments.filter(
    (card) => card.questionCount > 0 && card.assignment.status !== "completed"
  );
  const inProgress = due.find((card) => card.assignment.status === "in_progress");
  if (inProgress) return { kind: "custom", card: inProgress };
  if (due[0]) return { kind: "custom", card: due[0] };
  if (input.draft) return { kind: "keystone-draft", draft: input.draft };
  if (input.profile) return { kind: "keystone-result", profile: input.profile };
  const completed = input.assignments.find((card) => card.assignment.status === "completed");
  if (completed) return { kind: "custom", card: completed };
  return null;
}
