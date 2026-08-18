import {
  catalogSessionTotal,
  isLegacyCatalogTraining,
  isTrainingPublished,
  type Training,
} from "@/lib/father/types";

export type ManagerCatalogStatus = "pending" | "ready" | "catalog";

export type ManagerCatalogSource = {
  training: Training;
  sessionCount: number;
  groupId?: string;
  groupName?: string;
};

export type ManagerCatalogItem = {
  key: string;
  training: Training;
  sessionCount: number;
  status: ManagerCatalogStatus;
  href: string;
  groupName?: string;
};

function reviewHref(trainingId: string, groupId?: string) {
  return groupId
    ? `/manager/reviews/${trainingId}?group=${groupId}`
    : `/manager/reviews/${trainingId}`;
}

function asItem(
  source: ManagerCatalogSource,
  status: ManagerCatalogStatus,
  showGroupName: boolean
): ManagerCatalogItem {
  return {
    key: source.groupId ? `${source.groupId}-${source.training.id}` : source.training.id,
    training: source.training,
    sessionCount: source.sessionCount,
    status,
    href: reviewHref(source.training.id, source.groupId),
    groupName: showGroupName ? source.groupName : undefined,
  };
}

export function buildManagerCatalog(input: {
  trainings: Training[];
  pending: ManagerCatalogSource[];
  accepted: ManagerCatalogSource[];
  showGroupName?: boolean;
}): ManagerCatalogItem[] {
  const showGroupName = Boolean(input.showGroupName);
  const covered = new Set<string>();
  const items: ManagerCatalogItem[] = [];

  for (const source of input.pending) {
    if (!isTrainingPublished(source.training) || !source.training.released_at) continue;
    items.push(asItem(source, "pending", showGroupName));
    covered.add(source.training.id);
  }

  for (const source of input.accepted) {
    if (!isTrainingPublished(source.training)) continue;
    items.push(asItem(source, "ready", showGroupName));
    covered.add(source.training.id);
  }

  for (const training of input.trainings) {
    if (!isTrainingPublished(training) || !isLegacyCatalogTraining(training)) continue;
    if (covered.has(training.id)) continue;
    items.push(
      asItem(
        {
          training,
          sessionCount: catalogSessionTotal(training, training.session_count),
        },
        "catalog",
        false
      )
    );
  }

  return items.sort((left, right) => {
    const order = left.training.order_index - right.training.order_index;
    if (order !== 0) return order;
    return left.training.title.localeCompare(right.training.title);
  });
}
