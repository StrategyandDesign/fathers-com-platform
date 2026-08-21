import { trainingHandoutHref } from "@/lib/training-handouts/names";
import { createClient } from "@/lib/supabase/server";

export type TrainingHandout = {
  id: string;
  trainingId: string;
  fileName: string;
  byteSize: number;
  href: string;
};

export type TrainingHandoutRow = {
  id: string;
  training_id: string;
  storage_path: string;
  file_name: string;
  byte_size: number;
};

function missingHandouts(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /training_handouts/i.test(error.message ?? "")
  );
}

function asHandout(row: TrainingHandoutRow): TrainingHandout {
  return {
    id: row.id,
    trainingId: row.training_id,
    fileName: row.file_name,
    byteSize: row.byte_size,
    href: trainingHandoutHref(row.training_id, row.id),
  };
}

export async function loadTrainingHandouts(trainingId: string) {
  const map = await loadTrainingHandoutsByIds([trainingId]);
  return map.get(trainingId) ?? [];
}

export async function loadTrainingHandoutsByIds(trainingIds: string[]) {
  const unique = [...new Set(trainingIds.filter(Boolean))];
  const empty = new Map<string, TrainingHandout[]>();
  if (unique.length === 0) return empty;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("training_handouts")
      .select("id, training_id, storage_path, file_name, byte_size")
      .in("training_id", unique)
      .order("created_at", { ascending: true });

    if (error) {
      if (missingHandouts(error)) return empty;
      return empty;
    }

    const map = new Map<string, TrainingHandout[]>();
    for (const row of (data ?? []) as TrainingHandoutRow[]) {
      const list = map.get(row.training_id) ?? [];
      list.push(asHandout(row));
      map.set(row.training_id, list);
    }
    return map;
  } catch {
    return empty;
  }
}

export async function loadTrainingHandoutRecord(trainingId: string, handoutId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("training_handouts")
      .select("id, training_id, storage_path, file_name, byte_size")
      .eq("id", handoutId)
      .eq("training_id", trainingId)
      .maybeSingle();
    if (error || !data) return null;
    return data as TrainingHandoutRow;
  } catch {
    return null;
  }
}
