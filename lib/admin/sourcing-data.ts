import { createClient } from "@/lib/supabase/server";
import {
  asIntakeStatus,
  asRightsStatus,
  type IntakeStatus,
  type RightsStatus,
} from "@/lib/admin/sourcing";

export type TrainingSourceRow = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  channelUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrainingIntakeRow = {
  id: string;
  sourceId: string;
  trainingId: string | null;
  requestId: string | null;
  title: string;
  audience: string | null;
  outline: string | null;
  rightsStatus: RightsStatus;
  rightsNotes: string | null;
  status: IntakeStatus;
  createdAt: string;
  updatedAt: string;
  sourceName: string;
  trainingTitle: string | null;
  trainingReleasedAt: string | null;
};

function asSource(row: Record<string, unknown>): TrainingSourceRow {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    contactName: typeof row.contact_name === "string" ? row.contact_name : null,
    contactEmail: typeof row.contact_email === "string" ? row.contact_email : null,
    channelUrl: typeof row.channel_url === "string" ? row.channel_url : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function asIntake(
  row: Record<string, unknown>,
  sourceName: string,
  training?: { title?: string | null; released_at?: string | null } | null
): TrainingIntakeRow {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    trainingId: typeof row.training_id === "string" ? row.training_id : null,
    requestId: typeof row.request_id === "string" ? row.request_id : null,
    title: String(row.title ?? ""),
    audience: typeof row.audience === "string" ? row.audience : null,
    outline: typeof row.outline === "string" ? row.outline : null,
    rightsStatus: asRightsStatus(row.rights_status),
    rightsNotes: typeof row.rights_notes === "string" ? row.rights_notes : null,
    status: asIntakeStatus(row.status),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    sourceName,
    trainingTitle: training?.title ?? null,
    trainingReleasedAt: training?.released_at ?? null,
  };
}

export async function loadTrainingSources(): Promise<TrainingSourceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_sources")
    .select("*")
    .order("name");
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(asSource);
}

export async function loadTrainingSource(sourceId: string) {
  const sources = await loadTrainingSources();
  return sources.find((source) => source.id === sourceId) ?? null;
}

export async function loadTrainingIntakes(sourceId?: string): Promise<TrainingIntakeRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("training_intakes")
    .select("*")
    .order("created_at", { ascending: false });
  if (sourceId) query = query.eq("source_id", sourceId);
  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Record<string, unknown>[];
  const sourceIds = [...new Set(rows.map((row) => String(row.source_id)))];
  const trainingIds = rows
    .map((row) => row.training_id)
    .filter((value): value is string => typeof value === "string");

  const [sourcesRes, trainingsRes] = await Promise.all([
    sourceIds.length
      ? supabase.from("training_sources").select("id, name").in("id", sourceIds)
      : Promise.resolve({ data: [], error: null }),
    trainingIds.length
      ? supabase.from("trainings").select("id, title, released_at").in("id", trainingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (sourcesRes.error) throw sourcesRes.error;
  if (trainingsRes.error) throw trainingsRes.error;

  const sourceNames = new Map(
    ((sourcesRes.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name])
  );
  const trainings = new Map(
    ((trainingsRes.data ?? []) as Array<{ id: string; title: string; released_at: string | null }>).map(
      (row) => [row.id, row]
    )
  );

  return rows.map((row) =>
    asIntake(
      row,
      sourceNames.get(String(row.source_id)) ?? "Source",
      typeof row.training_id === "string" ? trainings.get(row.training_id) ?? null : null
    )
  );
}

export async function loadTrainingIntake(intakeId: string) {
  const intakes = await loadTrainingIntakes();
  return intakes.find((intake) => intake.id === intakeId) ?? null;
}

export async function loadIntakeForTraining(trainingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_intakes")
    .select("*")
    .eq("training_id", trainingId)
    .maybeSingle();
  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /training_intakes/i.test(error.message);
    if (missing) return null;
    throw error;
  }
  if (!data) return null;

  const { data: source } = await supabase
    .from("training_sources")
    .select("name")
    .eq("id", data.source_id)
    .maybeSingle();

  return asIntake(data as Record<string, unknown>, source?.name ?? "Source");
}

export async function loadOpenIntakeCount() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("training_intakes")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "drafting"]);
  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /training_intakes/i.test(error.message);
    if (missing) return null;
    throw error;
  }
  return count ?? 0;
}
