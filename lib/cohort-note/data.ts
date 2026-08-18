import { cache } from "react";

import {
  isCohortNoteVisible,
  type CohortNote,
  type FatherLeader,
} from "@/lib/cohort-note/types";
import { createClient } from "@/lib/supabase/server";
import { AVATARS_BUCKET, signStorageUrl } from "@/lib/storage";

type LeaderRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

function asLeaderRow(data: unknown): LeaderRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  if (typeof value.id !== "string") return null;
  return {
    id: value.id,
    full_name: typeof value.full_name === "string" ? value.full_name : null,
    avatar_url: typeof value.avatar_url === "string" ? value.avatar_url : null,
  };
}

export const loadFatherLeader = cache(async (fatherId: string): Promise<FatherLeader | null> => {
  if (!fatherId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("father_leader_identity");
  if (error) return null;
  const row = asLeaderRow(data);
  const name = row?.full_name?.trim() ?? "";
  if (!row || !name) return null;
  return {
    id: row.id,
    name,
    avatarUrl: await signStorageUrl(supabase, AVATARS_BUCKET, row.avatar_url),
  };
});

export const loadVisibleCohortNote = cache(async (fatherId: string): Promise<CohortNote | null> => {
  const supabase = await createClient();
  const { data: memberships, error: memberError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("father_id", fatherId)
    .order("joined_at", { ascending: true });
  if (memberError) return null;

  const groupIds = [...new Set((memberships ?? []).map((row) => String(row.group_id)))];
  if (groupIds.length === 0) return null;

  const [notesRes, dismissRes] = await Promise.all([
    supabase
      .from("organization_cohort_notes")
      .select("group_id, body, updated_at")
      .in("group_id", groupIds),
    supabase
      .from("organization_cohort_note_dismissals")
      .select("group_id, dismissed_at")
      .eq("father_id", fatherId)
      .in("group_id", groupIds),
  ]);
  if (notesRes.error || dismissRes.error) return null;

  const dismissedAt = new Map(
    ((dismissRes.data ?? []) as Array<{ group_id: string; dismissed_at: string }>).map((row) => [
      row.group_id,
      row.dismissed_at,
    ])
  );

  const visible = ((notesRes.data ?? []) as Array<{
    group_id: string;
    body: string;
    updated_at: string;
  }>)
    .filter((row) => isCohortNoteVisible(row.updated_at, dismissedAt.get(row.group_id)))
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

  const note = visible[0];
  if (!note?.body.trim()) return null;
  return {
    groupId: note.group_id,
    body: note.body.trim(),
    updatedAt: note.updated_at,
  };
});

export async function loadManagerCohortNotes(managerId: string) {
  const supabase = await createClient();
  const { data: groups, error: groupError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("manager_id", managerId)
    .order("created_at");
  if (groupError) throw groupError;

  const rows = (groups ?? []) as Array<{ id: string; name: string }>;
  const groupIds = rows.map((group) => group.id);
  if (groupIds.length === 0) return [];

  const { data: notes, error: noteError } = await supabase
    .from("organization_cohort_notes")
    .select("group_id, body, updated_at")
    .in("group_id", groupIds);
  if (noteError) {
    if (/organization_cohort_notes/i.test(noteError.message)) {
      return rows.map((group) => ({
        groupId: group.id,
        groupName: group.name,
        body: "",
        updatedAt: null,
      }));
    }
    throw noteError;
  }

  const noteByGroup = new Map(
    ((notes ?? []) as Array<{ group_id: string; body: string; updated_at: string }>).map((row) => [
      row.group_id,
      row,
    ])
  );

  return rows.map((group) => {
    const note = noteByGroup.get(group.id);
    return {
      groupId: group.id,
      groupName: group.name,
      body: note?.body ?? "",
      updatedAt: note?.updated_at ?? null,
    };
  });
}
