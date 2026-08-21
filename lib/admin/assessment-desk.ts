import type { PlatformAssessmentRow } from "@/lib/admin/assessment-sourcing-data";
import type { DevelopmentStatus } from "@/lib/admin/development";
import { asDevelopmentStatus, formatEditedAt } from "@/lib/admin/development";
import type { TrainingReleaseState } from "@/lib/admin/release";
import type { AdminReviewStatus } from "@/lib/admin/types";
import { KEYSTONE_ASSESSMENT_KEY } from "@/lib/assessments/availability";
import {
  firstPartyAdminPath,
  type FirstPartyAssessment,
} from "@/lib/assessments/first-party";
import { PROFILE_QUESTION_COUNT } from "@/lib/father/questions";

export type AdminAssessmentDeskItem = {
  key: string;
  title: string;
  href: string;
  actionHref: string;
  actionLabel: string;
  questionCount: number;
  kindLabel: string;
  editedAt: string | null;
  archived: boolean;
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

export function assessmentEditedAt(input: {
  releasedAt: string | null;
  firstReleasedAt: string | null;
}): string | null {
  return input.releasedAt ?? input.firstReleasedAt ?? null;
}

export function assessmentEditedLabel(input: {
  releasedAt: string | null;
  firstReleasedAt: string | null;
}): string {
  return `Edited ${formatEditedAt(assessmentEditedAt(input))}`;
}

export function keystoneDeskItem(keystone: {
  assessmentKey: string;
  releasedAt: string | null;
  firstReleasedAt: string | null;
  releaseTargets: Array<{ reviewStatus: AdminReviewStatus | null }>;
}): AdminAssessmentDeskItem {
  const release = {
    releasedAt: keystone.releasedAt,
    firstReleasedAt: keystone.firstReleasedAt,
  };

  return {
    key: keystone.assessmentKey || KEYSTONE_ASSESSMENT_KEY,
    title: "Keystone Assessment",
    href: "/admin/assessments/keystone",
    actionHref: "/admin/assessments/keystone",
    actionLabel: "Desk",
    questionCount: PROFILE_QUESTION_COUNT,
    kindLabel: "Platform assessment",
    editedAt: assessmentEditedAt(release),
    archived: false,
    developmentStatus: assessmentDevelopmentStatus(release),
    releaseState: assessmentReleaseState(release),
  };
}

export function firstPartyDeskItem(
  assessment: FirstPartyAssessment,
  release: {
    releasedAt: string | null;
    firstReleasedAt: string | null;
    releaseTargets: Array<{ reviewStatus: AdminReviewStatus | null }>;
    lastEditedAt?: string | null;
  }
): AdminAssessmentDeskItem {
  const state = {
    releasedAt: release.releasedAt,
    firstReleasedAt: release.firstReleasedAt,
  };

  return {
    key: assessment.key,
    title: assessment.title,
    href: firstPartyAdminPath(assessment.key),
    actionHref: firstPartyAdminPath(assessment.key),
    actionLabel: "Desk",
    questionCount: assessment.questionCount,
    kindLabel: "Platform assessment",
    editedAt: release.lastEditedAt ?? assessmentEditedAt(state),
    archived: false,
    developmentStatus: assessmentDevelopmentStatus(state),
    releaseState: assessmentReleaseState(state),
  };
}

export function sourcedAssessmentDeskItem(row: PlatformAssessmentRow): AdminAssessmentDeskItem {
  const questionCount = row.instrument?.items.length ?? 0;
  return {
    key: row.assessmentKey,
    title: row.title,
    href: row.intakeId
      ? `/admin/assessments/intakes/${row.intakeId}`
      : "/admin/assessments/sources",
    actionHref: row.intakeId
      ? `/admin/assessments/intakes/${row.intakeId}`
      : "/admin/assessments/sources",
    actionLabel: "Desk",
    questionCount,
    kindLabel: row.attribution ? `From ${row.attribution}` : "Brought in",
    editedAt: row.lastEditedAt,
    archived: row.archived || asDevelopmentStatus(row.developmentStatus) === "archived",
    developmentStatus: asDevelopmentStatus(row.developmentStatus),
    releaseState: row.developmentStatus === "released" ? "released" : "draft",
  };
}
