import { createClient } from "@/lib/supabase/server";
import { asIntakeStatus, asRightsStatus, type IntakeStatus, type RightsStatus } from "@/lib/admin/sourcing";
import type { AssessmentInstrument } from "@/lib/assessments/instrument";

export type AssessmentSourceRow = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  channelUrl: string | null;
  notes: string | null;
};

export type AssessmentIntakeRow = {
  id: string;
  sourceId: string;
  sourceName: string;
  platformAssessmentId: string | null;
  title: string;
  audience: string | null;
  description: string | null;
  questions: string | null;
  scoring: string | null;
  rightsStatus: RightsStatus;
  rightsNotes: string | null;
  status: IntakeStatus;
  updatedAt: string;
};

export type PlatformAssessmentRow = {
  id: string;
  assessmentKey: string;
  title: string;
  description: string | null;
  attribution: string | null;
  instrument: AssessmentInstrument | null;
  developmentStatus: string;
  archived: boolean;
  lastEditedAt: string | null;
  intakeId: string | null;
};

function missingRelation(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|Could not find the table/i.test(error.message ?? "")
  );
}

function asSource(row: Record<string, unknown>): AssessmentSourceRow {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    contactName: typeof row.contact_name === "string" ? row.contact_name : null,
    contactEmail: typeof row.contact_email === "string" ? row.contact_email : null,
    channelUrl: typeof row.channel_url === "string" ? row.channel_url : null,
    notes: typeof row.notes === "string" ? row.notes : null,
  };
}

function asIntake(row: Record<string, unknown>, sourceName: string): AssessmentIntakeRow {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    sourceName,
    platformAssessmentId:
      typeof row.platform_assessment_id === "string" ? row.platform_assessment_id : null,
    title: String(row.title ?? ""),
    audience: typeof row.audience === "string" ? row.audience : null,
    description: typeof row.description === "string" ? row.description : null,
    questions: typeof row.questions === "string" ? row.questions : null,
    scoring: typeof row.scoring === "string" ? row.scoring : null,
    rightsStatus: asRightsStatus(row.rights_status),
    rightsNotes: typeof row.rights_notes === "string" ? row.rights_notes : null,
    status: asIntakeStatus(row.status),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function asPlatform(row: Record<string, unknown>): PlatformAssessmentRow {
  const instrument =
    row.instrument && typeof row.instrument === "object"
      ? (row.instrument as AssessmentInstrument)
      : null;
  return {
    id: String(row.id),
    assessmentKey: String(row.assessment_key ?? ""),
    title: String(row.title ?? ""),
    description: typeof row.description === "string" ? row.description : null,
    attribution: typeof row.attribution === "string" ? row.attribution : null,
    instrument,
    developmentStatus: String(row.development_status ?? "draft"),
    archived: row.archived === true,
    lastEditedAt: typeof row.last_edited_at === "string" ? row.last_edited_at : null,
    intakeId: typeof row.intake_id === "string" ? row.intake_id : null,
  };
}

export async function loadAssessmentSources(): Promise<AssessmentSourceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessment_sources").select("*").order("name");
  if (missingRelation(error)) return [];
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(asSource);
}

export async function loadAssessmentSource(sourceId: string) {
  const sources = await loadAssessmentSources();
  return sources.find((source) => source.id === sourceId) ?? null;
}

export async function loadAssessmentIntakes(sourceId?: string): Promise<AssessmentIntakeRow[]> {
  const supabase = await createClient();
  let query = supabase.from("assessment_intakes").select("*").order("updated_at", { ascending: false });
  if (sourceId) query = query.eq("source_id", sourceId);
  const { data, error } = await query;
  if (missingRelation(error)) return [];
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const sourceIds = [...new Set(rows.map((row) => String(row.source_id)))];
  const sourcesRes = sourceIds.length
    ? await supabase.from("assessment_sources").select("id, name").in("id", sourceIds)
    : { data: [], error: null };
  if (sourcesRes.error && !missingRelation(sourcesRes.error)) throw sourcesRes.error;
  const names = new Map(
    ((sourcesRes.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name])
  );
  return rows.map((row) => asIntake(row, names.get(String(row.source_id)) ?? "Researcher"));
}

export async function loadAssessmentIntake(intakeId: string) {
  const intakes = await loadAssessmentIntakes();
  return intakes.find((intake) => intake.id === intakeId) ?? null;
}

export async function loadPlatformAssessments(): Promise<PlatformAssessmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessments")
    .select("*")
    .order("last_edited_at", { ascending: false });
  if (missingRelation(error)) return [];
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[])
    .map(asPlatform)
    .filter((row) => row.intakeId || row.instrument);
}
