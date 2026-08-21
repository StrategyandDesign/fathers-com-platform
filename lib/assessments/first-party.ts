import type { AssessmentInstrument } from "@/lib/assessments/instrument";
import {
  FAMILY_FORTRESS_ASSESSMENT_KEY,
  FAMILY_FORTRESS_COPY,
  FAMILY_FORTRESS_DESCRIPTION,
  FAMILY_FORTRESS_QUESTION_COUNT,
  FAMILY_FORTRESS_SLUG,
  FAMILY_FORTRESS_TITLE,
  familyFortressInstrument,
} from "@/lib/assessments/instruments/family-fortress";
import {
  LEGACY_ARCHITECT_ASSESSMENT_KEY,
  LEGACY_ARCHITECT_COPY,
  LEGACY_ARCHITECT_DESCRIPTION,
  LEGACY_ARCHITECT_QUESTION_COUNT,
  LEGACY_ARCHITECT_SLUG,
  LEGACY_ARCHITECT_TITLE,
  legacyArchitectInstrument,
} from "@/lib/assessments/instruments/legacy-architect";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FirstPartyAssessmentCopy = {
  introduction: string;
  purpose: string;
  goal: string;
  honestHint: string;
};

export type FirstPartyAssessment = {
  key: string;
  slug: string;
  title: string;
  description: string;
  questionCount: number;
  instrument: AssessmentInstrument;
  copy: FirstPartyAssessmentCopy;
};

export const FIRST_PARTY_ASSESSMENTS: FirstPartyAssessment[] = [
  {
    key: LEGACY_ARCHITECT_ASSESSMENT_KEY,
    slug: LEGACY_ARCHITECT_SLUG,
    title: LEGACY_ARCHITECT_TITLE,
    description: LEGACY_ARCHITECT_DESCRIPTION,
    questionCount: LEGACY_ARCHITECT_QUESTION_COUNT,
    instrument: legacyArchitectInstrument,
    copy: LEGACY_ARCHITECT_COPY,
  },
  {
    key: FAMILY_FORTRESS_ASSESSMENT_KEY,
    slug: FAMILY_FORTRESS_SLUG,
    title: FAMILY_FORTRESS_TITLE,
    description: FAMILY_FORTRESS_DESCRIPTION,
    questionCount: FAMILY_FORTRESS_QUESTION_COUNT,
    instrument: familyFortressInstrument,
    copy: FAMILY_FORTRESS_COPY,
  },
];

const FIRST_PARTY_BY_KEY = new Map(
  FIRST_PARTY_ASSESSMENTS.map((assessment) => [assessment.key, assessment])
);

export function listFirstPartyAssessments() {
  return FIRST_PARTY_ASSESSMENTS;
}

export function getFirstPartyAssessment(assessmentKey: string) {
  return FIRST_PARTY_BY_KEY.get(assessmentKey) ?? null;
}

export function isFirstPartyAssessmentKey(assessmentKey: string) {
  return FIRST_PARTY_BY_KEY.has(assessmentKey);
}

export function isCustomAssessmentKey(assessmentKey: string) {
  return UUID.test(assessmentKey);
}

export function isPlatformReviewKey(assessmentKey: string) {
  return assessmentKey === "keystone" || isFirstPartyAssessmentKey(assessmentKey);
}

export function firstPartyAssessmentTitle(assessmentKey: string) {
  if (assessmentKey === "keystone") return "Keystone Assessment";
  return getFirstPartyAssessment(assessmentKey)?.title ?? assessmentKey;
}

export function firstPartyTakePath(assessmentKey: string) {
  return `/father/assessments/p/${assessmentKey}`;
}

export function firstPartyAdminPath(assessmentKey: string) {
  return `/admin/assessments/${assessmentKey}`;
}

export function firstPartyManagerPath(assessmentKey: string) {
  return `/manager/assessments/${assessmentKey}`;
}

export function firstPartyReviewPath(assessmentKey: string) {
  return `/manager/assessment-reviews/${assessmentKey}`;
}
