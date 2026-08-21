import { firstPartyTakePath } from "@/lib/assessments/first-party";
import type { FatherFirstPartyCard } from "@/lib/assessments/first-party-data";
import { takeHref, type FatherAssignmentCard } from "@/lib/assessments/types";

export const KEYSTONE_RESULT_ID = "keystone";

export type AssessmentResultKind = "keystone" | "first-party" | "custom";
export type AssessmentRewardKind = "designation" | "determination" | "record";

export type FatherAssessmentResult = {
  id: string;
  kind: AssessmentResultKind;
  rewardKind: AssessmentRewardKind;
  title: string;
  rewardLabel: string;
  rewardDetail: string | null;
  score: { value: number; max: number } | null;
  completedAt: string;
  href: string;
};

export type KeystoneResultInput = {
  id?: string;
  takenAt: string;
  determination: string | null;
  edge?: string | null;
};

export type FirstPartyResultInput = {
  key: string;
  title: string;
  questionCount: number;
  maxTotal?: number;
  attempt: {
    completedAt: string | null;
    outcomeLabel: string | null;
    outcomeDescription: string | null;
    total: number | null;
  } | null;
};

export type CustomResultInput = {
  assignment: {
    id: string;
    status: string;
    completed_at: string | null;
  };
  assessment: {
    title: string;
  };
};

const KIND_RANK: Record<AssessmentResultKind, number> = {
  "first-party": 0,
  custom: 1,
  keystone: 2,
};

export function sortAssessmentResultsNewestFirst(results: FatherAssessmentResult[]) {
  return [...results].sort((left, right) => {
    const delta = Date.parse(right.completedAt) - Date.parse(left.completedAt);
    if (delta !== 0) return Number.isNaN(delta) ? 0 : delta;
    const kindDelta = KIND_RANK[left.kind] - KIND_RANK[right.kind];
    if (kindDelta !== 0) return kindDelta;
    return left.id.localeCompare(right.id);
  });
}

export function collectFatherAssessmentResults(input: {
  keystone?: KeystoneResultInput | null;
  firstParty?: FirstPartyResultInput[];
  assignments?: CustomResultInput[];
}): FatherAssessmentResult[] {
  const results: FatherAssessmentResult[] = [];

  if (input.keystone?.takenAt) {
    results.push({
      id: input.keystone.id ?? KEYSTONE_RESULT_ID,
      kind: "keystone",
      rewardKind: "determination",
      title: "Keystone Assessment",
      rewardLabel: input.keystone.determination?.trim() || "",
      rewardDetail: input.keystone.edge?.trim() || null,
      score: null,
      completedAt: input.keystone.takenAt,
      href: "/father/profile/results",
    });
  }

  for (const card of input.firstParty ?? []) {
    const completedAt = card.attempt?.completedAt;
    if (!completedAt) continue;
    const max = card.maxTotal ?? card.questionCount * 4;
    results.push({
      id: card.key,
      kind: "first-party",
      rewardKind: "designation",
      title: card.title,
      rewardLabel: card.attempt?.outcomeLabel?.trim() || "",
      rewardDetail: card.attempt?.outcomeDescription?.trim() || null,
      score: card.attempt?.total != null ? { value: card.attempt.total, max } : null,
      completedAt,
      href: firstPartyTakePath(card.key),
    });
  }

  for (const card of input.assignments ?? []) {
    if (card.assignment.status !== "completed" || !card.assignment.completed_at) continue;
    results.push({
      id: card.assignment.id,
      kind: "custom",
      rewardKind: "record",
      title: card.assessment.title,
      rewardLabel: "",
      rewardDetail: null,
      score: null,
      completedAt: card.assignment.completed_at,
      href: takeHref(card.assignment.id),
    });
  }

  return sortAssessmentResultsNewestFirst(results);
}

export function splitFeaturedAndArchive(results: FatherAssessmentResult[]) {
  const [featured = null, ...archive] = sortAssessmentResultsNewestFirst(results);
  return { featured, archive };
}

export function openAssessmentWork(input: {
  firstParty: FatherFirstPartyCard[];
  assignments: FatherAssignmentCard[];
}) {
  return {
    firstParty: input.firstParty.filter((item) => !item.attempt?.completedAt),
    assignments: input.assignments.filter((item) => item.assignment.status !== "completed"),
  };
}
