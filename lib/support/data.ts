import {
  SUPPORT_SCREENSHOTS_BUCKET,
  signStorageUrl,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import {
  isSupportCategory,
  isSupportStatus,
  isSupportSubmitterRole,
  type SupportFilter,
  type SupportReportRow,
} from "@/lib/support/types";

const LOAD_FAILED = "Unable to load reports right now.";

function asReport(row: Record<string, unknown>): SupportReportRow | null {
  if (!isSupportSubmitterRole(row.submitter_role)) return null;
  if (!isSupportCategory(row.category)) return null;
  if (!isSupportStatus(row.status)) return null;
  if (typeof row.id !== "string" || typeof row.submitter_id !== "string") return null;
  if (typeof row.message !== "string" || typeof row.created_at !== "string") return null;

  return {
    id: row.id,
    submitterId: row.submitter_id,
    submitterRole: row.submitter_role,
    category: row.category,
    page: typeof row.page === "string" && row.page.trim() ? row.page : null,
    message: row.message,
    screenshotPath:
      typeof row.screenshot_path === "string" && row.screenshot_path
        ? row.screenshot_path
        : null,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: typeof row.resolved_at === "string" ? row.resolved_at : null,
  };
}

export async function loadOpenSupportCount(): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("support_reports")
      .select("id", { count: "exact", head: true })
      .neq("status", "resolved");
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export async function loadSupportInbox(filter: SupportFilter): Promise<{
  rows: SupportReportRow[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const query = supabase
      .from("support_reports")
      .select(
        "id, submitter_id, submitter_role, category, page, message, screenshot_path, status, created_at, resolved_at"
      )
      .order("created_at", { ascending: false });

    const { data, error } =
      filter === "resolved"
        ? await query.eq("status", "resolved")
        : await query.neq("status", "resolved");

    if (error) return { rows: [], error: LOAD_FAILED };
    return {
      rows: ((data ?? []) as Record<string, unknown>[])
        .map(asReport)
        .filter((row): row is SupportReportRow => Boolean(row)),
      error: null,
    };
  } catch {
    return { rows: [], error: LOAD_FAILED };
  }
}

export async function loadSupportReport(id: string): Promise<{
  report: SupportReportRow | null;
  submitterName: string | null;
  screenshotUrl: string | null;
  error: string | null;
}> {
  const empty = {
    report: null,
    submitterName: null,
    screenshotUrl: null,
    error: null as string | null,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_reports")
      .select(
        "id, submitter_id, submitter_role, category, page, message, screenshot_path, status, created_at, resolved_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return { ...empty, error: LOAD_FAILED };
    if (!data) return empty;

    const report = asReport(data as Record<string, unknown>);
    if (!report) return empty;

    const [profileRes, screenshotUrl] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", report.submitterId).maybeSingle(),
      signStorageUrl(supabase, SUPPORT_SCREENSHOTS_BUCKET, report.screenshotPath),
    ]);

    const profileName =
      typeof profileRes.data?.full_name === "string" && profileRes.data.full_name.trim()
        ? profileRes.data.full_name.trim()
        : null;

    return {
      report,
      submitterName: profileName,
      screenshotUrl,
      error: null,
    };
  } catch {
    return { ...empty, error: LOAD_FAILED };
  }
}
