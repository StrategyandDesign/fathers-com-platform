import "server-only";

import {
  parseParticipationMode,
  type ParticipationMode,
} from "@/lib/participation";
import { createClient } from "@/lib/supabase/server";

export async function loadFatherParticipationMode(fatherId: string): Promise<ParticipationMode> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("group_members")
      .select("groups(participation_mode)")
      .eq("father_id", fatherId)
      .maybeSingle();
    if (error) {
      if (/participation_mode/i.test(error.message)) return "unset";
      return "unset";
    }
    const group = data?.groups as { participation_mode?: string | null } | { participation_mode?: string | null }[] | null;
    const row = Array.isArray(group) ? group[0] : group;
    return parseParticipationMode(row?.participation_mode);
  } catch {
    return "unset";
  }
}

export async function loadParticipationModesForFathers(
  fatherIds: string[],
  load: (ids: string[]) => Promise<Array<{ father_id: string; participation_mode?: string | null }>>
): Promise<Map<string, ParticipationMode>> {
  const modes = new Map<string, ParticipationMode>();
  if (fatherIds.length === 0) return modes;
  const rows = await load(fatherIds);
  for (const row of rows) {
    modes.set(row.father_id, parseParticipationMode(row.participation_mode));
  }
  return modes;
}
