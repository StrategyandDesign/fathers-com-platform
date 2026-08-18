import { PROFILE_QUESTION_COUNT } from "@/lib/father/questions";
import {
  KEYSTONE_ASSESSMENT_KEY,
  availabilityStatus,
  customAssessmentKey,
  type AssessmentAvailabilityRow,
  type AssessmentVisibility,
} from "@/lib/assessments/availability";
import type { AssessmentListItem } from "@/lib/assessments/types";

export type AssessmentCatalogKind = "keystone" | "custom";

export type AssessmentCatalogItem = {
  key: string;
  assessmentKey: string;
  kind: AssessmentCatalogKind;
  status: AssessmentVisibility;
  groupId: string;
  groupName?: string;
  href: string;
  questionCount: number;
  assignedCount: number;
  completedCount: number;
  customId?: string;
  title?: string;
  description?: string | null;
};

export function buildManagerAssessmentCatalog(input: {
  groups: Array<{ id: string; name: string }>;
  custom: AssessmentListItem[];
  availability: AssessmentAvailabilityRow[];
  keystoneCompletedByGroup: Record<string, number>;
  groupSize: Record<string, number>;
}): AssessmentCatalogItem[] {
  const showGroupName = input.groups.length > 1;
  const items: AssessmentCatalogItem[] = [];
  const groups = input.groups.length > 0 ? input.groups : [];

  if (groups.length === 0) {
    return input.custom.map((assessment) => ({
      key: assessment.id,
      assessmentKey: customAssessmentKey(assessment.id),
      kind: "custom" as const,
      status: "available" as const,
      groupId: "",
      href: `/manager/assessments/${assessment.id}`,
      questionCount: assessment.questionCount,
      assignedCount: assessment.assignedCount,
      completedCount: assessment.completedCount,
      customId: assessment.id,
      title: assessment.title,
      description: assessment.description,
    }));
  }

  for (const group of groups) {
    items.push({
      key: `${group.id}:${KEYSTONE_ASSESSMENT_KEY}`,
      assessmentKey: KEYSTONE_ASSESSMENT_KEY,
      kind: "keystone",
      status: availabilityStatus(input.availability, group.id, KEYSTONE_ASSESSMENT_KEY),
      groupId: group.id,
      groupName: showGroupName ? group.name : undefined,
      href: `/manager/assessments/keystone?group=${group.id}`,
      questionCount: PROFILE_QUESTION_COUNT,
      assignedCount: input.groupSize[group.id] ?? 0,
      completedCount: input.keystoneCompletedByGroup[group.id] ?? 0,
    });
  }

  for (const assessment of input.custom) {
    for (const group of groups) {
      const assessmentKey = customAssessmentKey(assessment.id);
      items.push({
        key: `${group.id}:${assessmentKey}`,
        assessmentKey,
        kind: "custom",
        status: availabilityStatus(input.availability, group.id, assessmentKey),
        groupId: group.id,
        groupName: showGroupName ? group.name : undefined,
        href: `/manager/assessments/${assessment.id}`,
        questionCount: assessment.questionCount,
        assignedCount: assessment.assignedCount,
        completedCount: assessment.completedCount,
        customId: assessment.id,
        title: assessment.title,
        description: assessment.description,
      });
    }
  }

  return items;
}

export function partitionAssessmentCatalog(items: AssessmentCatalogItem[]) {
  return {
    available: items.filter((item) => item.status === "available"),
    hidden: items.filter((item) => item.status === "hidden"),
  };
}
