import type { DevelopmentStatus } from "@/lib/admin/development";
import { formatEditedAt } from "@/lib/admin/development";
import type { TrainingReleaseState } from "@/lib/admin/release";
import type { AdminReviewStatus } from "@/lib/admin/types";
import { KEYSTONE_ASSESSMENT_KEY } from "@/lib/assessments/availability";
import { PROFILE_QUESTION_COUNT } from "@/lib/father/questions";

export type AdminAssessmentDeskItem = {
  key: string;
  title: string;
  href: string;
  actionHref: string;
  actionLabel: string;
  questionCount: number;
  subtitle: string;
  editedLabel: string;
  note: string | null;
  developmentStatus: DevelopmentStatus;
  releaseState: TrainingReleaseState;
};

export function assessmentReleaseState(input: {
  releasedAt: string | null;
  firstReleasedAt: string | null;
}): TrainingReleaseState {
  if (input.releasedAt) return "released";
  if (input.firstReleasedAt) return "ready";
  return "catalog";
}

export function assessmentDevelopmentStatus(input: {
  releasedAt: string | null;
}): DevelopmentStatus {
  return input.releasedAt ? "released" : "ready_for_review";
}

export function assessmentDeskNote(input: {
  releasedAt: string | null;
  firstReleasedAt: string | null;
  accepted: number;
  pending: number;
}): string | null {
  if (input.releasedAt) {
    return `${input.accepted} accepted · ${input.pending} waiting`;
  }
  if (input.firstReleasedAt) {
    return "Un-released. Leaders cannot accept it again until you release it.";
  }
  return "Not in Leader review yet. Every organization can already offer it.";
}

export function assessmentEditedLabel(input: {
  releasedAt: string | null;
  firstReleasedAt: string | null;
}): string {
  if (input.releasedAt) return `Released ${formatEditedAt(input.releasedAt)}`;
  if (input.firstReleasedAt) return `Last released ${formatEditedAt(input.firstReleasedAt)}`;
  return "Not released yet";
}

function countReviews(
  targets: Array<{ reviewStatus: AdminReviewStatus | null }>,
  status: AdminReviewStatus
) {
  return targets.filter((row) => row.reviewStatus === status).length;
}

export function keystoneDeskItem(keystone: {
  assessmentKey: string;
  releasedAt: string | null;
  firstReleasedAt: string | null;
  releaseTargets: Array<{ reviewStatus: AdminReviewStatus | null }>;
}): AdminAssessmentDeskItem {
  const accepted = countReviews(keystone.releaseTargets, "accepted");
  const pending = countReviews(keystone.releaseTargets, "pending");
  const release = {
    releasedAt: keystone.releasedAt,
    firstReleasedAt: keystone.firstReleasedAt,
  };

  return {
    key: keystone.assessmentKey || KEYSTONE_ASSESSMENT_KEY,
    title: "Keystone Assessment",
    href: "/admin/assessments/keystone",
    actionHref: "/admin/assessments/keystone#release",
    actionLabel: "Release",
    questionCount: PROFILE_QUESTION_COUNT,
    subtitle: `${PROFILE_QUESTION_COUNT} questions · Platform assessment`,
    editedLabel: assessmentEditedLabel(release),
    note: assessmentDeskNote({ ...release, accepted, pending }),
    developmentStatus: assessmentDevelopmentStatus(release),
    releaseState: assessmentReleaseState(release),
  };
}
