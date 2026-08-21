import { loadAdminUsers } from "@/lib/admin/data";
import { createClient } from "@/lib/supabase/server";
import {
  isStaffMessageAudience,
  isStaffMessageRole,
  type AdminStaffMessageRow,
  type StaffMessagePerson,
  type StaffRibbonMessage,
} from "@/lib/staff-messages/types";

type QueryClient = Awaited<ReturnType<typeof createClient>>;

function missingRelation(error: { message?: string; code?: string } | null, name: string) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    new RegExp(name, "i").test(error.message ?? "")
  );
}

function personName(fullName: string | null, email: string | null, id: string) {
  return fullName?.trim() || email?.trim() || `Leader ${id.slice(0, 8)}`;
}

export async function loadStaffMessageDirectory(): Promise<StaffMessagePerson[]> {
  const users = await loadAdminUsers();
  const byId = new Map(users.map((user) => [user.id, user]));
  const supabase = await createClient();
  const [staffRes, groupsRes] = await Promise.all([
    supabase.from("organization_staff").select("group_id, profile_id, staff_role"),
    supabase.from("groups").select("id, name, manager_id"),
  ]);

  const groups = (groupsRes.data ?? []) as Array<{
    id: string;
    name: string;
    manager_id: string;
  }>;
  const groupName = new Map(groups.map((group) => [group.id, group.name]));
  const orgsByPerson = new Map<string, Set<string>>();

  function addOrg(profileId: string, name: string | undefined) {
    if (!name) return;
    const current = orgsByPerson.get(profileId) ?? new Set<string>();
    current.add(name);
    orgsByPerson.set(profileId, current);
  }

  const eligible = new Map<string, StaffMessagePerson>();

  function addPerson(id: string, role: "manager" | "reviewer") {
    const user = byId.get(id);
    if (!user || user.deactivated_at) return;
    if (user.role !== role) return;
    const existing = eligible.get(id);
    if (existing && existing.role !== role) return;
    eligible.set(id, {
      id,
      name: personName(user.full_name, user.email, id),
      email: user.email,
      role,
      organization: null,
    });
  }

  if (!staffRes.error) {
    for (const row of (staffRes.data ?? []) as Array<{
      group_id: string;
      profile_id: string;
      staff_role: string;
    }>) {
      if (!isStaffMessageRole(row.staff_role)) continue;
      addPerson(row.profile_id, row.staff_role);
      addOrg(row.profile_id, groupName.get(row.group_id));
    }
  } else if (!missingRelation(staffRes.error, "organization_staff")) {
    throw staffRes.error;
  }

  for (const group of groups) {
    addPerson(group.manager_id, "manager");
    addOrg(group.manager_id, group.name);
  }

  for (const user of users) {
    if (user.role !== "reviewer" || user.deactivated_at) continue;
    addPerson(user.id, "reviewer");
    if (user.organization) addOrg(user.id, user.organization);
  }

  return [...eligible.values()]
    .map((person) => ({
      ...person,
      organization: [...(orgsByPerson.get(person.id) ?? [])].join(", ") || person.organization,
    }))
    .sort((left, right) => {
      if (left.role !== right.role) return left.role === "manager" ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
}

export async function loadAdminStaffMessages(): Promise<AdminStaffMessageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_staff_messages")
    .select("id, body, audience, created_at, platform_staff_message_recipients(dismissed_at)")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) {
    if (missingRelation(error, "platform_staff_messages")) return [];
    throw error;
  }

  return ((data ?? []) as Array<{
    id: string;
    body: string;
    audience: string;
    created_at: string;
    platform_staff_message_recipients?: Array<{ dismissed_at?: string | null }> | null;
  }>).flatMap((row) => {
    if (!isStaffMessageAudience(row.audience)) return [];
    const recipients = row.platform_staff_message_recipients ?? [];
    return [
      {
        id: row.id,
        body: row.body,
        audience: row.audience,
        createdAt: row.created_at,
        recipientCount: recipients.length,
        dismissedCount: recipients.filter((item) => item.dismissed_at).length,
      },
    ];
  });
}

export async function loadOpenStaffRibbon(profileId: string) {
  const supabase = await createClient();
  return loadStaffRibbonMessages(supabase, profileId);
}

export async function loadStaffRibbonMessages(
  supabase: QueryClient,
  profileId: string
): Promise<StaffRibbonMessage[]> {
  const { data, error } = await supabase
    .from("platform_staff_message_recipients")
    .select("message_id, platform_staff_messages(id, body, created_at)")
    .eq("profile_id", profileId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: true })
    .limit(8);
  if (error) {
    if (missingRelation(error, "platform_staff_message")) return [];
    console.error("[staff-messages] load failed", error.message);
    return [];
  }

  return ((data ?? []) as Array<{
    message_id: string;
    platform_staff_messages?:
      | { id?: string; body?: string; created_at?: string }
      | { id?: string; body?: string; created_at?: string }[]
      | null;
  }>).flatMap((row) => {
    const message = Array.isArray(row.platform_staff_messages)
      ? row.platform_staff_messages[0]
      : row.platform_staff_messages;
    const body = typeof message?.body === "string" ? message.body.trim() : "";
    if (!body) return [];
    return [
      {
        id: typeof message?.id === "string" ? message.id : row.message_id,
        body,
        createdAt: typeof message?.created_at === "string" ? message.created_at : "",
      },
    ];
  });
}
