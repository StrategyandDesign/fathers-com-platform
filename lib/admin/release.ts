import { notifyTrainingReleased } from "@/lib/email/events";
import { isTrainingPublished } from "@/lib/father/types";
import { createClient } from "@/lib/supabase/server";

export { isLegacyCatalogTraining } from "@/lib/father/types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export const RELEASE_CONFIRM = "RELEASE";
export const UNRELEASE_CONFIRM = "UNRELEASE";

export type TrainingReleaseState = "draft" | "ready" | "catalog" | "released";

export const RELEASE_STATE_LABEL: Record<TrainingReleaseState, string> = {
  draft: "Draft",
  ready: "Ready",
  catalog: "In catalog",
  released: "Released for Review",
};

export function trainingReleaseState(training: {
  published?: boolean | null;
  released_at?: string | null;
  first_published_at?: string | null;
  first_released_at?: string | null;
}): TrainingReleaseState {
  if (training.released_at) return "released";
  if (training.first_released_at) {
    return isTrainingPublished(training) ? "ready" : "draft";
  }
  if (training.first_published_at) return "catalog";
  if (isTrainingPublished(training)) return "ready";
  return "draft";
}

export function releaseStateClassName(state: TrainingReleaseState) {
  if (state === "released") return "text-primary";
  if (state === "catalog") return "text-foreground";
  return "text-muted-foreground";
}

type ReleaseRow = {
  manager_id: string;
  group_id: string;
  is_new: boolean;
  training_id?: string;
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
  fallbackTrainingId: string,
  titles: Map<string, string>
) {
  const seen = new Set<string>();
  const jobs = rows
    .filter((row) => row.is_new)
    .flatMap((row) => {
      const trainingId = row.training_id ?? fallbackTrainingId;
      const key = `${row.manager_id}:${trainingId}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        notifyTrainingReleased({
          managerId: row.manager_id,
          trainingId,
          trainingTitle: titles.get(trainingId) ?? "A new training",
        }),
      ];
    });

  const results = await Promise.allSettled(jobs);
  let failed = 0;
  let sent = 0;
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[release] notify fan-out failed", result.reason);
      failed += 1;
      continue;
    }
    if (result.value === "failed") failed += 1;
    if (result.value === "sent") sent += 1;
  }
  return { sent, failed };
}

export async function releaseTrainingToManagers(
  supabase: ServerClient,
  input: {
    trainingId: string;
    trainingTitle: string;
    releasedBy: string;
    groupIds?: string[] | null;
  }
) {
  try {
    const { data, error } = await supabase.rpc("release_training_to_organizations", {
      p_training_id: input.trainingId,
      p_released_by: input.releasedBy,
      p_group_ids: input.groupIds && input.groupIds.length > 0 ? input.groupIds : null,
    });

    if (error) {
      console.error("[release] write failed", error.message);
      return { ok: false as const, notifyFailed: false };
    }

    const rows = asReleaseRows(data);
    const newCount = rows.filter((row) => row.is_new).length;
    const notify = await notifyNewRows(
      rows,
      input.trainingId,
      new Map([[input.trainingId, input.trainingTitle]])
    );
    return {
      ok: true as const,
      newCount,
      targetCount: rows.length,
      notified: notify.sent > 0 || newCount > 0,
      notifyFailed: notify.failed > 0,
    };
  } catch (error) {
    console.error("[release] write failed", error);
    return { ok: false as const, notifyFailed: false };
  }
}

export async function unreleaseTrainingFromManagers(
  supabase: ServerClient,
  trainingId: string
) {
  try {
    const { error } = await supabase.rpc("unrelease_training_from_organizations", {
      p_training_id: trainingId,
    });
    if (error) {
      console.error("[release] unrelease write failed", error.message);
      return { ok: false as const };
    }
    return { ok: true as const };
  } catch (error) {
    console.error("[release] unrelease write failed", error);
    return { ok: false as const };
  }
}

export async function seedGroupTrainingReviews(supabase: ServerClient, groupId: string) {
  const { data, error } = await supabase.rpc("seed_group_training_reviews", {
    p_group_id: groupId,
  });

  if (error) {
    console.error("[release] seed group reviews failed", error.message);
    return;
  }

  const rows = asReleaseRows(data).filter((row) => row.is_new && row.training_id);
  if (rows.length === 0) return;

  const trainingIds = [...new Set(rows.map((row) => row.training_id).filter(Boolean))] as string[];
  const { data: trainings, error: trainingError } = await supabase
    .from("trainings")
    .select("id, title")
    .in("id", trainingIds);

  if (trainingError) {
    console.error("[release] seed titles failed", trainingError.message);
    return;
  }

  const titles = new Map(
    ((trainings ?? []) as Array<{ id: string; title: string }>).map((row) => [row.id, row.title])
  );
  const notify = await notifyNewRows(rows, trainingIds[0] ?? "", titles);
  if (notify.failed > 0) {
    console.error("[release] seed notify fan-out failed", notify.failed);
  }
}
