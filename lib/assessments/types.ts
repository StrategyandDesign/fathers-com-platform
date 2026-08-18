export const CUSTOM_QUESTION_TYPES = ["short_text", "single_select"] as const;
export type CustomQuestionType = (typeof CUSTOM_QUESTION_TYPES)[number];

export const ASSIGNMENT_STATUSES = ["not_started", "in_progress", "completed"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export type CustomAssessment = {
  id: string;
  manager_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomAssessmentQuestion = {
  id: string;
  assessment_id: string;
  order_index: number;
  prompt: string;
  question_type: CustomQuestionType;
  options: string[] | null;
};

export type CustomAssessmentAssignment = {
  id: string;
  assessment_id: string;
  father_id: string;
  assigned_by: string | null;
  status: AssignmentStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type CustomAssessmentAnswer = {
  id: string;
  assignment_id: string;
  question_id: string;
  value: string;
  updated_at: string;
};

export type QuestionDraftInput = {
  prompt: string;
  question_type: CustomQuestionType;
  options: string[] | null;
};

export type RosterFather = {
  fatherId: string;
  name: string;
  groupId: string;
};

export type AssessmentListItem = CustomAssessment & {
  questionCount: number;
  assignedCount: number;
  completedCount: number;
};

export type AssignmentRow = CustomAssessmentAssignment & {
  fatherName: string;
};

export type FatherAssignmentCard = {
  assignment: CustomAssessmentAssignment;
  assessment: CustomAssessment;
  questionCount: number;
  answeredCount: number;
};

export function isQuestionType(value: unknown): value is CustomQuestionType {
  return typeof value === "string" && CUSTOM_QUESTION_TYPES.includes(value as CustomQuestionType);
}

export function isAssignmentStatus(value: unknown): value is AssignmentStatus {
  return typeof value === "string" && ASSIGNMENT_STATUSES.includes(value as AssignmentStatus);
}

export function asStringOptions(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const options = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return options.length >= 2 ? options : null;
}

export function pickFeaturedAssignment(cards: FatherAssignmentCard[]) {
  const usable = cards.filter(
    (card) => card.questionCount > 0 || card.assignment.status === "completed"
  );
  const pool = usable.length > 0 ? usable : cards;
  return (
    pool.find((card) => card.assignment.status === "completed") ??
    pool.find((card) => card.assignment.status === "in_progress") ??
    pool.find((card) => card.assignment.status === "not_started") ??
    null
  );
}

export function takeHref(
  assignmentId: string,
  questionNumber?: number,
  options?: { root?: string }
) {
  const root = options?.root ?? "/father";
  if (!questionNumber) return `${root}/assessments/${assignmentId}`;
  return `${root}/assessments/${assignmentId}?q=${questionNumber}`;
}

export function assignmentActionLabel(status: AssignmentStatus) {
  if (status === "completed") return "View";
  if (status === "in_progress") return "Continue";
  return "Take";
}
