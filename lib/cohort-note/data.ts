import { cache } from "react";

import { canSeeCohortNoteAudience } from "@/lib/cohort-note/audience";
import {
  isCohortNoteVisible,
  resolveCohortNoteAuthorName,
  type CohortNote,
  type FatherLeader,
  type ManagerCohortDeskGroup,
} from "@/lib/cohort-note/types";
import { loadGroupsForManager, loadOrganizationStaff } from "@/lib/org-staff/membership";
import { visibleCohortNotes } from "@/lib/org-staff/types";
import { createClient } from "@/lib/supabase/server";
import { AVATARS_BUCKET, signStorageUrl, signStorageUrls } from "@/lib/storage";

type NoteRow = {
  id?: string;
  group_id: string;
  author_id?: string;
  body: string;
  updated_at: string;
  audience_training_id?: string | null;
};

type LeaderRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

function asLeaderRows(data: unknown): LeaderRow[] {
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const value = row as Record<string, unknown>;
    if (typeof value.id !== "string") return [];
    return [
      {
        id: value.id,
        full_name: typeof value.full_name === "string" ? value.full_name : null,
        avatar_url: typeof value.avatar_url === "string" ? value.avatar_url : null,
      },
    ];
  });
}

export const loadFatherLeaders = cache(async (fatherId: string): Promise<FatherLeader[]> => {
  if (!fatherId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("father_leader_identities");
  const rows = error ? asLeaderRows(null) : asLeaderRows(data);
  if (rows.length === 0) {
    const fallback = await supabase.rpc("father_leader_identity");
    rows.push(...asLeaderRows(fallback.data));
  }
  const unique = new Map<string, LeaderRow>();
  for (const row of rows) {
    if (!unique.has(row.id) && row.full_name?.trim()) unique.set(row.id, row);
  }
  const leaders = [...unique.values()];
  const urls = await signStorageUrls(
    supabase,
    AVATARS_BUCKET,
    leaders.map((row) => row.avatar_url)
  );
  return leaders.map((row) => ({
    id: row.id,
    name: row.full_name?.trim() ?? "",
    avatarUrl: row.avatar_url ? urls.get(row.avatar_url) ?? null : null,
  }));
});

export const loadFatherLeader = cache(async (fatherId: string): Promise<FatherLeader | null> => {
  const leaders = await loadFatherLeaders(fatherId);
  return leaders[0] ?? null;
});

export const loadVisibleCohortNotes = cache(async (fatherId: string): Promise<CohortNote[]> => {
  const supabase = await createClient();
  const { data: memberships, error: memberError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("father_id", fatherId)
    .order("joined_at", { ascending: true });
  if (memberError) return [];

  const groupIds = [...new Set((memberships ?? []).map((row) => String(row.group_id)))];
  if (groupIds.length === 0) return [];

  const [notesRes, dismissRes, assignmentRes] = await Promise.all([
    supabase
      .from("organization_cohort_notes")
      .select("id, group_id, author_id, body, updated_at, audience_training_id")
      .in("group_id", groupIds),
    supabase
      .from("organization_cohort_note_dismissals")
      .select("note_id, group_id, dismissed_at")
      .eq("father_id", fatherId),
    supabase.from("training_assignments").select("training_id").eq("father_id", fatherId),
  ]);
  let noteData = notesRes.data as NoteRow[] | null;
  if (notesRes.error) {
    if (!/audience_training_id/i.test(`${notesRes.error.code} ${notesRes.error.message}`)) {
      return [];
    }
    const legacy = await supabase
      .from("organization_cohort_notes")
      .select("id, group_id, author_id, body, updated_at")
      .in("group_id", groupIds);
    if (legacy.error) return [];
    noteData = (legacy.data ?? []) as NoteRow[];
  }

  const noteRows = noteData ?? [];
  const assignedTrainingIds = new Set(
    ((assignmentRes.data ?? []) as Array<{ training_id: string }>).map((row) => row.training_id)
  );

  const dismissedByNote = new Map<string, string>();
  const dismissedByGroup = new Map<string, string>();
  for (const row of (dismissRes.data ?? []) as Array<{
    note_id?: string;
    group_id?: string;
    dismissed_at: string;
  }>) {
    if (row.note_id) dismissedByNote.set(row.note_id, row.dismissed_at);
    if (row.group_id) dismissedByGroup.set(row.group_id, row.dismissed_at);
  }

  const authorIds = [...new Set(noteRows.map((row) => row.author_id).filter(Boolean))] as string[];
  const [leaders, authorsRes] = await Promise.all([
    loadFatherLeaders(fatherId),
    authorIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
  ]);
  const authorName = new Map(
    ((authorsRes.data ?? []) as Array<{ id: string; full_name: string | null }>).map((row) => [
      row.id,
      row.full_name?.trim() || null,
    ])
  );

  const prepared = noteRows
    .filter(
      (row) =>
        row.body.trim() &&
        canSeeCohortNoteAudience(row.audience_training_id, assignedTrainingIds)
    )
    .map((row) => ({
      id: row.id ?? `${row.group_id}:${row.author_id ?? "leader"}`,
      groupId: row.group_id,
      authorId: row.author_id ?? "",
      authorName:
        resolveCohortNoteAuthorName(row.author_id, leaders) ||
        (row.author_id ? authorName.get(row.author_id) ?? null : null),
      body: row.body.trim(),
      updatedAt: row.updated_at,
      audienceTrainingId: row.audience_training_id ?? null,
      dismissedAt: (row.id && dismissedByNote.get(row.id)) || dismissedByGroup.get(row.group_id) || null,
    }));

  return visibleCohortNotes(prepared, isCohortNoteVisible).map(({ dismissedAt: _dismissedAt, ...note }) => note);
});

export const loadVisibleCohortNote = cache(async (fatherId: string): Promise<CohortNote | null> => {
  const notes = await loadVisibleCohortNotes(fatherId);
  return notes[0] ?? null;
});

export async function loadManagerCohortNotes(
  managerId: string
): Promise<ManagerCohortDeskGroup[]> {
  const supabase = await createClient();
  const groups = await loadGroupsForManager(managerId, supabase);
  if (groups.length === 0) return [];

  const groupIds = groups.map((group) => group.id);
  const notesWithAudience = await supabase
    .from("organization_cohort_notes")
    .select("id, group_id, author_id, body, updated_at, audience_training_id")
    .in("group_id", groupIds);
  const notesLegacy =
    notesWithAudience.error &&
    /audience_training_id/i.test(`${notesWithAudience.error.code} ${notesWithAudience.error.message}`)
      ? await supabase
          .from("organization_cohort_notes")
          .select("id, group_id, author_id, body, updated_at")
          .in("group_id", groupIds)
      : null;
  const notes = (notesLegacy ?? notesWithAudience).data as NoteRow[] | null;
  const noteError = (notesLegacy ?? notesWithAudience).error;
  if (noteError) {
    if (/organization_cohort_notes/i.test(noteError.message)) {
      return groups.map((group) => ({
        groupId: group.id,
        groupName: group.name,
        fatherCount: 0,
        audiences: [],
        leaders: [],
        own: null,
        peers: [],
      }));
    }
    throw noteError;
  }

  const noteRows = (notes ?? []) as Array<{
    id: string;
    group_id: string;
    author_id: string;
    body: string;
    updated_at: string;
    audience_training_id?: string | null;
  }>;
  const authorIds = [...new Set(noteRows.map((row) => row.author_id).filter(Boolean))];
  const [authorsRes, staff] = await Promise.all([
    authorIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
    loadOrganizationStaff(groupIds),
  ]);
  const authorName = new Map(
    ((authorsRes.data ?? []) as Array<{ id: string; full_name: string | null }>).map((row) => [
      row.id,
      row.full_name?.trim() || "A leader",
    ])
  );

  return groups.map((group) => {
    const forGroup = noteRows.filter((row) => row.group_id === group.id);
    const ownRow = forGroup.find((row) => row.author_id === managerId);
    return {
      groupId: group.id,
      groupName: group.name,
      fatherCount: 0,
      audiences: [],
      leaders: staff
        .filter((row) => row.groupId === group.id)
        .map((row) => ({
          id: row.profileId,
          name: row.name,
          staffRole: row.staffRole,
        })),
      own: ownRow
        ? {
            id: ownRow.id,
            body: ownRow.body ?? "",
            updatedAt: ownRow.updated_at,
            audienceTrainingId: ownRow.audience_training_id ?? null,
          }
        : null,
      peers: forGroup
        .filter((row) => row.author_id !== managerId && row.body.trim())
        .map((row) => ({
          authorId: row.author_id,
          authorName: authorName.get(row.author_id) ?? "A leader",
          body: row.body,
          updatedAt: row.updated_at,
          audienceTrainingId: row.audience_training_id ?? null,
        })),
    };
  });
}
