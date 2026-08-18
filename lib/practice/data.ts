import {
  loadFatherAssignments,
  loadLeaderAssessmentAccess,
  loadManagerAssessments,
} from "@/lib/assessments/data";
import { loadFatherHome } from "@/lib/father/data";
import type { Session, SessionProgress, Training } from "@/lib/father/types";

export async function loadLeaderPractice(managerId: string) {
  const home = await loadFatherHome(managerId);
  const [access, owned, assignments] = await Promise.all([
    loadLeaderAssessmentAccess(managerId, Boolean(home.profile || home.draft)),
    loadManagerAssessments(managerId),
    loadFatherAssignments(managerId),
  ]);

  const nextCard = [...home.trainingCards]
    .sort((left, right) => left.training.order_index - right.training.order_index)
    .find((card) => card.next);

  const assignmentByAssessment = new Map(
    assignments.map((card) => [card.assessment.id, card])
  );
  const customAssessments = owned
    .filter((item) => item.questionCount > 0 || assignmentByAssessment.has(item.id))
    .map((item) => ({
      assessment: item,
      assignment: assignmentByAssessment.get(item.id) ?? null,
    }));

  return {
    trainingCards: home.trainingCards,
    next: nextCard?.next
      ? {
          session: nextCard.next as Session,
          training: nextCard.training as Training,
          progress: nextCard.nextProgress as SessionProgress | null,
        }
      : null,
    profile: home.profile,
    draft: home.draft,
    canStartKeystone: Boolean(home.profile || home.draft || access.canStartKeystone),
    customAssessments,
  };
}
