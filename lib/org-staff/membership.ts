import type { Group } from "@/lib/manager/types";
import { createClient } from "@/lib/supabase/server";
import {
  isOrganizationStaffRole,
  type OrganizationStaffMember,
  type OrganizationStaffRole,
} from "@/lib/org-staff/types";

type StaffClient = Awaited<ReturnType<typeof createClient>>;

function missingRelation(error: { message?: string; code?: string } | null, name: string) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    new RegExp(name, "i").test(error.message ?? "")
  );
}

export async function loadStaffGroupIds(
  supabase: StaffClient,
  profileId: string,
  role: OrganizationStaffRole
): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("organization_staff")
    .select("group_id")
    .eq("profile_id", profileId)
    .eq("staff_role", role);
  if (error) {
    if (missingRelation(error, "organization_staff")) return null;
    throw error;
  }
  return [...new Set((data ?? []).map((row) => String(row.group_id)))];
}

export async function loadGroupsForManager(
  managerId: string,
  supabase?: StaffClient
): Promise<Group[]> {
  const client = supabase ?? (await createClient());
  const staffIds = await loadStaffGroupIds(client, managerId, "manager");
  const { data: owned, error: ownedError } = await client
    .from("groups")
    .select("*")
    .eq("manager_id", managerId)
    .order("created_at");
  if (ownedError) throw ownedError;
  const ownedRows = (owned ?? []) as Group[];
  if (staffIds === null) return ownedRows;

  const ids = [...new Set([...staffIds, ...ownedRows.map((row) => row.id)])];
  if (ids.length === 0) return [];

  const { data, error } = await client
    .from("groups")
    .select("*")
    .in("id", ids)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Group[];
}

export async function loadReviewerGroupIds(reviewerId: string): Promise<string[]> {
  const supabase = await createClient();
  const staffIds = await loadStaffGroupIds(supabase, reviewerId, "reviewer");
  if (staffIds && staffIds.length > 0) return staffIds;

  const { data } = await supabase.rpc("reviewer_scoped_group_ids");
  if (Array.isArray(data) && data.length > 0) {
    return [
      ...new Set(
        data
          .map((row) => {
            if (typeof row === "string") return row;
            if (row && typeof row === "object" && "group_id" in row) {
              return String((row as { group_id: unknown }).group_id);
            }
            return "";
          })
          .filter(Boolean)
      ),
    ];
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("home_group_id")
    .eq("id", reviewerId)
    .maybeSingle();
  return profile?.home_group_id ? [String(profile.home_group_id)] : staffIds ?? [];
}

export async function isManagerOfGroup(
  supabase: StaffClient,
  managerId: string,
  groupId: string
) {
  if (!groupId) return false;
  const { data, error } = await supabase.rpc("is_manager_of_group", { group_id: groupId });
  if (!error) return Boolean(data);

  const groups = await loadGroupsForManager(managerId, supabase);
  return groups.some((group) => group.id === groupId);
}

export async function loadOrganizationStaff(
  groupIds: string[]
): Promise<OrganizationStaffMember[]> {
  const ids = [...new Set(groupIds.filter(Boolean))];
  if (ids.length === 0) return [];

  const supabase = await createClient();
  const [{ data: groups, error: groupError }, staffRes] = await Promise.all([
    supabase.from("groups").select("id, manager_id").in("id", ids),
    supabase
      .from("organization_staff")
      .select("group_id, profile_id, staff_role, added_at")
      .in("group_id", ids)
      .order("added_at"),
  ]);
  if (groupError) throw groupError;

  const listed = new Map(
    ((groups ?? []) as Array<{ id: string; manager_id: string }>).map((row) => [
      row.id,
      row.manager_id,
    ])
  );

  let rows = (staffRes.data ?? []) as Array<{
    group_id: string;
    profile_id: string;
    staff_role: string;
    added_at: string;
  }>;

  if (staffRes.error && missingRelation(staffRes.error, "organization_staff")) {
    rows = ((groups ?? []) as Array<{ id: string; manager_id: string }>).map((row) => ({
      group_id: row.id,
      profile_id: row.manager_id,
      staff_role: "manager",
      added_at: "",
    }));
  } else if (staffRes.error) {
    throw staffRes.error;
  }

  if (rows.length === 0) {
    rows = ((groups ?? []) as Array<{ id: string; manager_id: string }>).map((row) => ({
      group_id: row.id,
      profile_id: row.manager_id,
      staff_role: "manager",
      added_at: "",
    }));
  }

  const profileIds = [...new Set(rows.map((row) => row.profile_id))];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds.length ? profileIds : ["00000000-0000-0000-0000-000000000000"]);
  if (profileError) throw profileError;

  const names = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string | null }>).map((row) => [
      row.id,
      row.full_name?.trim() || "Leader",
    ])
  );

  return rows.flatMap((row) => {
    if (!isOrganizationStaffRole(row.staff_role)) return [];
    return [
      {
        groupId: row.group_id,
        profileId: row.profile_id,
        staffRole: row.staff_role,
        name: names.get(row.profile_id) ?? "Leader",
        addedAt: row.added_at,
        listedOwner: listed.get(row.group_id) === row.profile_id,
      },
    ];
  });
}

/** Every Leader seat on the same organizations, including this manager. */
export async function loadOrgManagerIds(managerId: string, supabase?: StaffClient) {
  const groups = await loadGroupsForManager(managerId, supabase);
  const staff = await loadOrganizationStaff(groups.map((group) => group.id));
  return [
    ...new Set([
      managerId,
      ...staff.filter((row) => row.staffRole === "manager").map((row) => row.profileId),
    ]),
  ];
}
