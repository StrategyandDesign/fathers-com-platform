import type { Session, SessionProgress, Training } from "@/lib/father/types";

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  manager_id: string;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  father_id: string;
  joined_at: string;
};

export type ManagedProfile = {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
};

export type TrainingAssignment = {
  id: string;
  father_id: string;
  training_id: string;
  assigned_by: string | null;
  assigned_at: string;
};

export type Certificate = {
  id: string;
  father_id: string;
  training_id: string;
  serial_number: string;
  issued_at: string;
  issued_by: string | null;
  pdf_url?: string | null;
  pdf_storage_path?: string | null;
};

export type ProfileResult = {
  father_id: string;
  taken_at: string;
  primary_edge: string | null;
  primary_determination: string | null;
};

export type ProfileDraftRow = {
  father_id: string;
  answers: Record<string, unknown>;
  current_index: number;
  updated_at: string;
};

export type AttentionItem = {
  fatherId: string;
  name: string;
  reason: string;
};

export type TrainingProgress = {
  training: Training;
  sessions: Session[];
  completed: number;
  total: number;
  assigned: boolean;
  certificate: Certificate | null;
  current: {
    session: Session;
    progress: SessionProgress | null;
  } | null;
};

export type ParticipantRow = {
  fatherId: string;
  name: string;
  avatarUrl: string | null;
  groupId: string;
  groupName: string;
  joinedAt: string;
  profileStatus: "completed" | "in_progress" | "not_started";
  profile: ProfileResult | null;
  progressLabel: string;
  lastActivity: string | null;
};

export function displayName(profile: ManagedProfile | null, fatherId: string) {
  const name = profile?.full_name?.trim();
  return name || `Father ${fatherId.slice(0, 8)}`;
}

export function profileName(
  profile: ManagedProfile | null | undefined,
  fallback: string
) {
  return profile?.full_name?.trim() || fallback;
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function latestTimestamp(values: Array<string | null | undefined>) {
  const dates = values.filter((value): value is string => Boolean(value)).sort();
  return dates.at(-1) ?? null;
}
