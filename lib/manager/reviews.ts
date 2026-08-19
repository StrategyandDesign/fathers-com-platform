import {
  catalogSessionTotal,
  isLegacyCatalogTraining,
  isTrainingPublished,
  type Session,
  type Training,
} from "@/lib/father/types";
import type { Group } from "@/lib/manager/types";
import { createClient } from "@/lib/supabase/server";

export { isTrainingAssignable } from "@/lib/father/types";

export const REVIEW_STATUSES = ["pending", "accepted", "declined"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const DECLINE_REASON_MAX = 400;
export const REVERSE_ACCEPT_CONFIRM = "ACCEPT";

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

export type OrganizationTrainingReview = {
  group_id: string;
  training_id: string;
  status: ReviewStatus;
  decline_reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

export type ManagerNotification = {
  id: string;
  manager_id: string;
  group_id: string | null;
  training_id: string | null;
  kind: "training_release" | "assessment_release";
  assessment_key?: string | null;
  title: string;
  body: string | null;
  href: string;
  read_at: string | null;
  created_at: string;
};

export type ReviewQueueItem = {
  review: OrganizationTrainingReview;
  training: Training;
  groupName: string;
  sessionCount: number;
};

export type ReviewDetail = {
  review: OrganizationTrainingReview | null;
  training: Training;
  groupName: string;
  sessions: Session[];
};

export function isReviewStatus(value: string): value is ReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(value);
}

export function reviewForGroup(
  reviews: OrganizationTrainingReview[],
  groupId: string,
  trainingId: string
) {
  return (
    reviews.find((row) => row.group_id === groupId && row.training_id === trainingId) ?? null
  );
}

function asReview(row: OrganizationTrainingReview): OrganizationTrainingReview {
  return {
    ...row,
    status: isReviewStatus(row.status) ? row.status : "pending",
  };
}

function asNotification(row: ManagerNotification): ManagerNotification {
  return row;
}

export async function loadOrganizationReviews(groupIds: string[]) {
  if (groupIds.length === 0) return [] as OrganizationTrainingReview[];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_training_reviews")
    .select(
      "group_id, training_id, status, decline_reason, decided_by, decided_at, created_at"
    )
    .in("group_id", groupIds)
    .order("created_at", { ascending: false });

  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /organization_training_reviews/i.test(error.message);
    if (missing) return [];
    throw error;
  }
  return ((data ?? []) as OrganizationTrainingReview[]).map(asReview);
}

export async function loadManagerNotifications(managerId: string, limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manager_notifications")
    .select("id, manager_id, group_id, training_id, kind, title, body, href, read_at, created_at")
    .eq("manager_id", managerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /manager_notifications/i.test(error.message);
    if (missing) return [];
    throw error;
  }
  return ((data ?? []) as ManagerNotification[]).map(asNotification);
}

export async function markTrainingNotificationsRead(managerId: string, trainingId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("manager_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("manager_id", managerId)
    .eq("training_id", trainingId)
    .is("read_at", null);

  if (error) {
    console.error("[reviews] mark read failed", error.message);
  }
}

async function loadManagedGroups(managerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("manager_id", managerId)
    .order("created_at");

  if (error) throw error;
  return (data ?? []) as Group[];
}

export async function loadReviewQueue(managerId: string) {
  const groups = await loadManagedGroups(managerId);
  const groupIds = groups.map((group) => group.id);
  const groupName = new Map(groups.map((group) => [group.id, group.name]));

  const [reviews, notifications, trainingsRes, sessionsRes] = await Promise.all([
    loadOrganizationReviews(groupIds),
    loadManagerNotifications(managerId),
    (async () => {
      const supabase = await createClient();
      return supabase
        .from("trainings")
        .select("*")
        .order("order_index");
    })(),
    (async () => {
      const supabase = await createClient();
      return supabase.from("sessions").select("id, training_id");
    })(),
  ]);

  if (trainingsRes.error) throw trainingsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;

  const trainings = (trainingsRes.data ?? []) as Training[];
  const sessionCounts = new Map<string, number>();
  for (const row of sessionsRes.data ?? []) {
    sessionCounts.set(row.training_id, (sessionCounts.get(row.training_id) ?? 0) + 1);
  }

  function toItem(review: OrganizationTrainingReview, training: Training): ReviewQueueItem {
    return {
      review,
      training,
      groupName: groupName.get(review.group_id) ?? "Your organization",
      sessionCount: catalogSessionTotal(training, sessionCounts.get(training.id) ?? 0),
    };
  }

  const items: ReviewQueueItem[] = reviews.flatMap((review) => {
    const training = trainings.find((row) => row.id === review.training_id);
    if (!training?.released_at) return [];
    return [toItem(review, training)];
  });

  const history = reviews
    .flatMap((review) => {
      if (review.status === "pending") return [];
      const training = trainings.find((row) => row.id === review.training_id);
      if (!training) return [];
      return [toItem(review, training)];
    })
    .sort((left, right) => {
      const leftAt = Date.parse(left.review.decided_at ?? left.review.created_at);
      const rightAt = Date.parse(right.review.decided_at ?? right.review.created_at);
      return rightAt - leftAt;
    });

  const pending = items.filter((item) => item.review.status === "pending");
  const unread = notifications.filter((row) => !row.read_at);

  return {
    groups,
    items,
    pending,
    history,
    notifications,
    unread,
  };
}

export async function loadReviewDetail(
  managerId: string,
  trainingId: string,
  groupId?: string | null
) {
  const queue = await loadReviewQueue(managerId);
  const matches = queue.items.filter((item) => item.training.id === trainingId);
  const item =
    (groupId ? matches.find((row) => row.review.group_id === groupId) : null) ??
    matches.find((row) => row.review.status === "pending") ??
    matches[0];

  if (!item) {
    return loadCatalogTrainingDetail(queue.groups, trainingId);
  }

  const sessions = await loadTrainingSessions(trainingId);
  await markTrainingNotificationsRead(managerId, trainingId);

  return {
    review: item.review,
    training: item.training,
    groupName: item.groupName,
    sessions,
    otherGroups: matches.filter((row) => row.review.group_id !== item.review.group_id),
  } satisfies ReviewDetail & { otherGroups: ReviewQueueItem[] };
}

async function loadTrainingSessions(trainingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, training_id, session_number, title, keyline, video_url, order_index")
    .eq("training_id", trainingId)
    .order("order_index", { ascending: true })
    .order("session_number", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as Session[]).sort(
    (left, right) =>
      left.order_index - right.order_index || left.session_number - right.session_number
  );
}

async function loadCatalogTrainingDetail(groups: Group[], trainingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trainings")
    .select("*")
    .eq("id", trainingId)
    .maybeSingle();

  if (error) throw error;
  const training = data as Training | null;
  if (!training || !isTrainingPublished(training) || !isLegacyCatalogTraining(training)) {
    return null;
  }

  return {
    review: null,
    training,
    groupName: groups[0]?.name ?? "Your organization",
    sessions: await loadTrainingSessions(trainingId),
    otherGroups: [] as ReviewQueueItem[],
  } satisfies ReviewDetail & { otherGroups: ReviewQueueItem[] };
}

async function loadReviewIdSet(rpc: "my_accepted_training_ids" | "my_declined_training_ids") {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(rpc);
  if (error) {
    console.error(`[reviews] ${rpc} failed`, error.message);
    return { ids: new Set<string>(), unavailable: true };
  }
  const list = Array.isArray(data) ? data.filter((id): id is string => typeof id === "string") : [];
  return { ids: new Set(list), unavailable: false };
}

export async function loadAcceptedTrainingIds() {
  return loadReviewIdSet("my_accepted_training_ids");
}

export async function loadDeclinedTrainingIds() {
  return loadReviewIdSet("my_declined_training_ids");
}
