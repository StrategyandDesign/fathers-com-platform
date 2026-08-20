import { createHash, randomBytes } from "node:crypto";

export const MANAGER_INVITE_DAYS = 14;

export function createManagerInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashManagerInviteToken(token) };
}

export function hashManagerInviteToken(token: string) {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function managerInviteExpiresAt(now = new Date(), days = MANAGER_INVITE_DAYS) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isManagerInviteOpen(invite: {
  acceptedAt?: string | null;
  expiresAt: string;
}, now = new Date()) {
  if (invite.acceptedAt) return false;
  return new Date(invite.expiresAt).getTime() > now.getTime();
}

export function normalizeInviteEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function isInviteEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

export function managerJoinHref(token: string, appUrl: string) {
  const url = new URL("/join/leader", `${appUrl.replace(/\/$/, "")}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

export type ManagerInviteRow = {
  id: string;
  email: string;
  fullName: string | null;
  organizationName: string;
  groupId: string | null;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

export function asManagerInvite(row: Record<string, unknown>): ManagerInviteRow | null {
  if (typeof row.id !== "string") return null;
  if (typeof row.email !== "string") return null;
  if (typeof row.organization_name !== "string") return null;
  if (typeof row.expires_at !== "string") return null;
  if (typeof row.created_at !== "string") return null;
  return {
    id: row.id,
    email: row.email,
    fullName: typeof row.full_name === "string" ? row.full_name : null,
    organizationName: row.organization_name,
    groupId: typeof row.group_id === "string" ? row.group_id : null,
    acceptedAt: typeof row.accepted_at === "string" ? row.accepted_at : null,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export function managerInviteStatus(invite: ManagerInviteRow, now = new Date()) {
  if (invite.acceptedAt) return "accepted" as const;
  if (!isManagerInviteOpen(invite, now)) return "expired" as const;
  return "pending" as const;
}
