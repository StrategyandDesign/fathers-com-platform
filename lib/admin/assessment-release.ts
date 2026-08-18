import { notifyAssessmentReleased } from "@/lib/email/events";
import { KEYSTONE_ASSESSMENT_KEY } from "@/lib/assessments/availability";
import { platformAssessmentTitle } from "@/lib/assessments/reviews";
import { createClient } from "@/lib/supabase/server";

export { RELEASE_CONFIRM, UNRELEASE_CONFIRM } from "@/lib/admin/release";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type ReleaseRow = {
  manager_id: string;
  group_id: string;
  assessment_key?: string;
  is_new: boolean;
};

function asReleaseRows(data: unknown): ReleaseRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is ReleaseRow => {
    if (!row || typeof row !== "object") return false;
    const value = row as Record<string, unknown>;
    return (
      typeof value.manager_id === "string" &&
      typeof value.group_id === "string" &&
      typeof value.is_new === "boolean"
    );
  });
}

async function notifyNewRows(
  rows: ReleaseRow[],
  fallbackKey: string,
  fallbackTitle?: string
) {
  const seen = new Set<string>();
  const jobs = rows
    .filter((row) => row.is_new)
    .flatMap((row) => {
      const assessmentKey = row.assessment_key ?? fallbackKey;
      const key = `${row.manager_id}:${assessmentKey}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        notifyAssessmentReleased({
          managerId: row.manager_id,
          assessmentKey,
          assessmentTitle: platformAssessmentTitle(assessmentKey, fallbackTitle),
        }),
      ];
    });

  const results = await Promise.allSettled(jobs);
  let failed = 0;
  let sent = 0;
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[assessment-release] notify fan-out failed", result.reason);
      failed += 1;
      continue;
    }
    if (result.value === "failed") failed += 1;
    if (result.value === "sent") sent += 1;
  }
  return { sent, failed };
}

export async function releaseAssessmentToManagers(
  supabase: ServerClient,
  input: {
    assessmentKey: string;
    releasedBy: string;
    groupIds?: string[] | null;
    assessmentTitle?: string;
  }
) {
  try {
    const { data, error } = await supabase.rpc("release_assessment_to_organizations", {
      p_assessment_key: input.assessmentKey,
      p_released_by: input.releasedBy,
      p_group_ids: input.groupIds && input.groupIds.length > 0 ? input.groupIds : null,
    });

    if (error) {
      console.error("[assessment-release] write failed", error.message);
      return { ok: false as const, notifyFailed: false };
    }

    const rows = asReleaseRows(data);
    const newCount = rows.filter((row) => row.is_new).length;
    const notify = await notifyNewRows(rows, input.assessmentKey, input.assessmentTitle);
    return {
      ok: true as const,
      newCount,
      targetCount: rows.length,
      notified: notify.sent > 0 || newCount > 0,
      notifyFailed: notify.failed > 0,
    };
  } catch (error) {
    console.error("[assessment-release] write failed", error);
    return { ok: false as const, notifyFailed: false };
  }
}

export async function unreleaseAssessmentFromManagers(
  supabase: ServerClient,
  assessmentKey: string
) {
  try {
    const { error } = await supabase.rpc("unrelease_assessment_from_organizations", {
      p_assessment_key: assessmentKey,
    });
    if (error) {
      console.error("[assessment-release] unrelease write failed", error.message);
      return { ok: false as const };
    }
    return { ok: true as const };
  } catch (error) {
    console.error("[assessment-release] unrelease write failed", error);
    return { ok: false as const };
  }
}

export async function seedGroupAssessmentReviews(supabase: ServerClient, groupId: string) {
  const { data, error } = await supabase.rpc("seed_group_assessment_reviews", {
    p_group_id: groupId,
  });

  if (error) {
    const missing =
      error.code === "PGRST202" ||
      /seed_group_assessment_reviews/i.test(error.message);
    if (missing) return;
    console.error("[assessment-release] seed group reviews failed", error.message);
    return;
  }

  const rows = asReleaseRows(data).filter((row) => row.is_new);
  if (rows.length === 0) return;

  const notify = await notifyNewRows(rows, KEYSTONE_ASSESSMENT_KEY);
  if (notify.failed > 0) {
    console.error("[assessment-release] seed notify fan-out failed", notify.failed);
  }
}
