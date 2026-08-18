import { createClient } from "@/lib/supabase/server";

export const GATHERING_MIN_COHORT = 3;

export type GatheringRoleSlice = {
  optedIn: number;
  eligible: number;
  ready: boolean;
};

export type GatheringTrainingRow = {
  title: string;
  notStarted: number | null;
  inProgress: number | null;
  completed: number | null;
};

export type GatheringTrendPoint = {
  week: string;
  count: number;
};

export type AdminGathering = {
  unavailable: boolean;
  minCohort: number;
  fathers: GatheringRoleSlice & {
    started: number | null;
    completedOneSession: number | null;
    trainingsCompleted: number | null;
    sessionsCompleted: number | null;
    certificates: number | null;
    assessmentsCompleted: number | null;
    profilesCompleted: number | null;
    trainingDistribution: GatheringTrainingRow[];
    completionTrend: GatheringTrendPoint[];
  };
  managers: GatheringRoleSlice & {
    assignments: number | null;
    certificatesIssued: number | null;
    reviewsAccepted: number | null;
    reviewsDeclined: number | null;
    reviewsPending: number | null;
  };
  reviewers: GatheringRoleSlice & {
    scoped: number | null;
    unscoped: number | null;
  };
};

type RawSlice = {
  opted_in?: unknown;
  eligible?: unknown;
  ready?: unknown;
};

function asInt(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asOptionalInt(value: unknown, ready: boolean) {
  if (!ready || value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function sliceOf(raw: RawSlice | null | undefined): GatheringRoleSlice {
  return {
    optedIn: asInt(raw?.opted_in),
    eligible: asInt(raw?.eligible),
    ready: raw?.ready === true,
  };
}

function emptyRoleSlice(): GatheringRoleSlice {
  return { optedIn: 0, eligible: 0, ready: false };
}

export function emptyAdminGathering(unavailable = false): AdminGathering {
  return {
    unavailable,
    minCohort: GATHERING_MIN_COHORT,
    fathers: {
      ...emptyRoleSlice(),
      started: null,
      completedOneSession: null,
      trainingsCompleted: null,
      sessionsCompleted: null,
      certificates: null,
      assessmentsCompleted: null,
      profilesCompleted: null,
      trainingDistribution: [],
      completionTrend: [],
    },
    managers: {
      ...emptyRoleSlice(),
      assignments: null,
      certificatesIssued: null,
      reviewsAccepted: null,
      reviewsDeclined: null,
      reviewsPending: null,
    },
    reviewers: {
      ...emptyRoleSlice(),
      scoped: null,
      unscoped: null,
    },
  };
}

export async function loadAdminGathering(): Promise<AdminGathering> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_anonymous_gathering");
    if (error || !data || typeof data !== "object") {
      return emptyAdminGathering(true);
    }

    const raw = data as Record<string, unknown>;
    const fathersRaw = (raw.fathers ?? {}) as RawSlice & Record<string, unknown>;
    const managersRaw = (raw.managers ?? {}) as RawSlice & Record<string, unknown>;
    const reviewersRaw = (raw.reviewers ?? {}) as RawSlice & Record<string, unknown>;
    const fathers = sliceOf(fathersRaw);
    const managers = sliceOf(managersRaw);
    const reviewers = sliceOf(reviewersRaw);
    const distribution = Array.isArray(fathersRaw.training_distribution)
      ? fathersRaw.training_distribution
      : [];
    const trend = Array.isArray(fathersRaw.completion_trend)
      ? fathersRaw.completion_trend
      : [];

    return {
      unavailable: false,
      minCohort: asInt(raw.min_cohort, GATHERING_MIN_COHORT),
      fathers: {
        ...fathers,
        started: asOptionalInt(fathersRaw.started, fathers.ready),
        completedOneSession: asOptionalInt(
          fathersRaw.completed_one_session,
          fathers.ready
        ),
        trainingsCompleted: asOptionalInt(fathersRaw.trainings_completed, fathers.ready),
        sessionsCompleted: asOptionalInt(fathersRaw.sessions_completed, fathers.ready),
        certificates: asOptionalInt(fathersRaw.certificates, fathers.ready),
        assessmentsCompleted: asOptionalInt(
          fathersRaw.assessments_completed,
          fathers.ready
        ),
        profilesCompleted: asOptionalInt(fathersRaw.profiles_completed, fathers.ready),
        trainingDistribution: distribution.flatMap((row) => {
          if (!row || typeof row !== "object") return [];
          const item = row as Record<string, unknown>;
          return [
            {
              title: typeof item.title === "string" ? item.title : "Training",
              notStarted: asOptionalInt(item.not_started, true),
              inProgress: asOptionalInt(item.in_progress, true),
              completed: asOptionalInt(item.completed, true),
            },
          ];
        }),
        completionTrend: trend.flatMap((row) => {
          if (!row || typeof row !== "object") return [];
          const item = row as Record<string, unknown>;
          if (typeof item.week !== "string") return [];
          const count = asOptionalInt(item.count, true);
          if (count == null) return [];
          return [{ week: item.week, count }];
        }),
      },
      managers: {
        ...managers,
        assignments: asOptionalInt(managersRaw.assignments, managers.ready),
        certificatesIssued: asOptionalInt(
          managersRaw.certificates_issued,
          managers.ready
        ),
        reviewsAccepted: asOptionalInt(managersRaw.reviews_accepted, managers.ready),
        reviewsDeclined: asOptionalInt(managersRaw.reviews_declined, managers.ready),
        reviewsPending: asOptionalInt(managersRaw.reviews_pending, managers.ready),
      },
      reviewers: {
        ...reviewers,
        scoped: asOptionalInt(reviewersRaw.scoped, reviewers.ready),
        unscoped: asOptionalInt(reviewersRaw.unscoped, reviewers.ready),
      },
    };
  } catch {
    return emptyAdminGathering(true);
  }
}

export function sharingInventory(gathering: AdminGathering) {
  return (
    gathering.fathers.optedIn +
    gathering.managers.optedIn +
    gathering.reviewers.optedIn
  );
}
