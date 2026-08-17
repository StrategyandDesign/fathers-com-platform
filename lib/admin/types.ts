import type { AppRole } from "@/lib/auth/roles";
import type { Session, Training } from "@/lib/father/types";
import type { Group } from "@/lib/manager/types";

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  role: AppRole;
  email: string | null;
  deactivated_at: string | null;
  created_at: string;
  organization: string | null;
};

export type AdminGroupRow = Group & {
  managerName: string;
  managerEmail: string | null;
  participantCount: number;
};

export type AdminParticipantRow = {
  fatherId: string;
  name: string;
  email: string | null;
  joinedAt: string;
};

export type AdminReviewStatus = "pending" | "accepted" | "declined";

export type AdminReleaseTarget = {
  id: string;
  name: string;
  reviewStatus: AdminReviewStatus | null;
};

export type AdminTrainingRow = Training & {
  published: boolean;
  releasedByName: string | null;
  sessions: Session[];
  releaseTargets: AdminReleaseTarget[];
};

export type AdminDashboard = {
  organizationCount: number;
  userCount: number;
  trainingCount: number;
  unpublishedCount: number;
};
