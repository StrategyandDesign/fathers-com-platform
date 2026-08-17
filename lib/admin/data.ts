import { isAppRole } from "@/lib/auth/roles";
import { isTrainingPublished, type Session, type Training } from "@/lib/father/types";
import { displayName, type Group, type GroupMember, type ManagedProfile } from "@/lib/manager/types";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminDashboard,
  AdminGroupRow,
  AdminParticipantRow,
  AdminTrainingRow,
  AdminUserRow,
} from "@/lib/admin/types";

function asUser(row: Record<string, unknown>): AdminUserRow {
  const role = isAppRole(row.role) ? row.role : "father";
  return {
    id: String(row.id),
    full_name: typeof row.full_name === "string" ? row.full_name : null,
    role,
    email: typeof row.email === "string" ? row.email : null,
    deactivated_at: typeof row.deactivated_at === "string" ? row.deactivated_at : null,
    created_at: String(row.created_at ?? ""),
    organization: typeof row.organization === "string" ? row.organization : null,
  };
}

export async function loadAdminUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(asUser);
}

export async function loadAdminUser(userId: string) {
  const users = await loadAdminUsers();
  return users.find((user) => user.id === userId) ?? null;
}

export async function loadAdminDashboard(): Promise<AdminDashboard> {
  const supabase = await createClient();
  const [groupsRes, users, trainingsRes] = await Promise.all([
    supabase.from("groups").select("id"),
    loadAdminUsers(),
    supabase.from("trainings").select("id, published"),
  ]);

  if (groupsRes.error) throw groupsRes.error;
  if (trainingsRes.error) throw trainingsRes.error;

  const trainings = (trainingsRes.data ?? []) as Array<{ published?: boolean | null }>;

  return {
    organizationCount: groupsRes.data?.length ?? 0,
    userCount: users.length,
    trainingCount: trainings.length,
    unpublishedCount: trainings.filter((row) => !isTrainingPublished(row)).length,
  };
}

export async function loadAdminOrganizations(): Promise<AdminGroupRow[]> {
  const supabase = await createClient();
  const [groupsRes, membersRes, users] = await Promise.all([
    supabase.from("groups").select("*").order("created_at"),
    supabase.from("group_members").select("group_id, father_id"),
    loadAdminUsers(),
  ]);

  if (groupsRes.error) throw groupsRes.error;
  if (membersRes.error) throw membersRes.error;

  const usersById = new Map(users.map((user) => [user.id, user]));
  const counts = new Map<string, number>();
  for (const member of (membersRes.data ?? []) as GroupMember[]) {
    counts.set(member.group_id, (counts.get(member.group_id) ?? 0) + 1);
  }

  return ((groupsRes.data ?? []) as Group[]).map((group) => {
    const manager = usersById.get(group.manager_id);
    return {
      ...group,
      managerName: manager?.full_name?.trim() || manager?.email || "Manager",
      managerEmail: manager?.email ?? null,
      participantCount: counts.get(group.id) ?? 0,
    };
  });
}

export async function loadAdminOrganization(groupId: string) {
  const organizations = await loadAdminOrganizations();
  const group = organizations.find((row) => row.id === groupId);
  if (!group) return null;

  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("group_members")
    .select("father_id, joined_at")
    .eq("group_id", groupId)
    .order("joined_at");

  if (error) throw error;

  const users = await loadAdminUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  const fatherIds = (members ?? []).map((member) => member.father_id);
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", fatherIds.length ? fatherIds : ["00000000-0000-0000-0000-000000000000"]);

  if (profileError) throw profileError;
  const profileById = new Map(
    ((profiles ?? []) as ManagedProfile[]).map((profile) => [profile.id, profile])
  );

  const participants: AdminParticipantRow[] = (members ?? []).map((member) => {
    const user = usersById.get(member.father_id);
    return {
      fatherId: member.father_id,
      name: displayName(profileById.get(member.father_id) ?? null, member.father_id),
      email: user?.email ?? null,
      joinedAt: member.joined_at,
    };
  });

  return { group, participants, managers: users.filter((user) => user.role === "manager") };
}

export async function loadAdminTrainings(): Promise<AdminTrainingRow[]> {
  const supabase = await createClient();
  const [trainingsRes, sessionsRes] = await Promise.all([
    supabase.from("trainings").select("*").order("order_index"),
    supabase.from("sessions").select("*").order("order_index"),
  ]);

  if (trainingsRes.error) throw trainingsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;

  const sessions = (sessionsRes.data ?? []) as Session[];
  const trainings = (trainingsRes.data ?? []) as Training[];
  const releaserIds = [
    ...new Set(trainings.map((training) => training.released_by).filter(Boolean)),
  ] as string[];

  const names = new Map<string, string>();
  if (releaserIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", releaserIds);
    if (profileError) throw profileError;
    for (const profile of profiles ?? []) {
      const name = profile.full_name?.trim();
      if (name) names.set(profile.id, name);
    }
  }

  return trainings.map((training) => ({
    ...training,
    published: isTrainingPublished(training),
    releasedByName: training.released_by ? names.get(training.released_by) ?? "Super-admin" : null,
    sessions: sessions
      .filter((session) => session.training_id === training.id)
      .sort((a, b) => a.order_index - b.order_index || a.session_number - b.session_number),
  }));
}

export async function loadAdminTraining(trainingId: string) {
  const trainings = await loadAdminTrainings();
  return trainings.find((training) => training.id === trainingId) ?? null;
}

export async function loadTrainingUsage(trainingId: string) {
  const supabase = await createClient();
  const sessionsRes = await supabase.from("sessions").select("id").eq("training_id", trainingId);
  if (sessionsRes.error) throw sessionsRes.error;
  const sessionIds = (sessionsRes.data ?? []).map((row) => row.id);

  const [assignments, progress, certificates] = await Promise.all([
    supabase
      .from("training_assignments")
      .select("id", { count: "exact", head: true })
      .eq("training_id", trainingId),
    sessionIds.length === 0
      ? Promise.resolve({ count: 0, error: null })
      : supabase
          .from("session_progress")
          .select("id", { count: "exact", head: true })
          .in("session_id", sessionIds),
    supabase
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .eq("training_id", trainingId),
  ]);

  if (assignments.error) throw assignments.error;
  if (progress.error) throw progress.error;
  if (certificates.error) throw certificates.error;

  return {
    assignmentCount: assignments.count ?? 0,
    progressCount: progress.count ?? 0,
    certificateCount: certificates.count ?? 0,
  };
}

export async function loadSessionUsage(sessionId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("session_progress")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (error) throw error;
  return count ?? 0;
}
