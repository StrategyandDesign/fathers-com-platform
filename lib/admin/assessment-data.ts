import { keystoneDeskItem } from "@/lib/admin/assessment-desk";
import { createClient } from "@/lib/supabase/server";
import { KEYSTONE_ASSESSMENT_KEY } from "@/lib/assessments/availability";
import type { AdminReleaseTarget, AdminReviewStatus } from "@/lib/admin/types";
import { displayName } from "@/lib/manager/types";

function asReviewStatus(value: string | null | undefined): AdminReviewStatus | null {
  if (value === "pending" || value === "accepted" || value === "declined") return value;
  return null;
}

export type AdminAssessmentRelease = {
  assessmentKey: string;
  releasedAt: string | null;
  firstReleasedAt: string | null;
  releasedByName: string | null;
  releaseTargets: AdminReleaseTarget[];
};

export async function loadAdminKeystoneRelease(): Promise<AdminAssessmentRelease> {
  const supabase = await createClient();
  const [groupsRes, reviewsRes, releaseRes] = await Promise.all([
    supabase.from("groups").select("id, name").order("name"),
    supabase
      .from("organization_assessment_reviews")
      .select("group_id, assessment_key, status")
      .eq("assessment_key", KEYSTONE_ASSESSMENT_KEY),
    supabase
      .from("platform_assessment_releases")
      .select("assessment_key, released_at, first_released_at, released_by")
      .eq("assessment_key", KEYSTONE_ASSESSMENT_KEY)
      .maybeSingle(),
  ]);

  if (groupsRes.error) throw groupsRes.error;

  const groups = (groupsRes.data ?? []) as Array<{ id: string; name: string }>;
  const reviews = reviewsRes.error
    ? []
    : ((reviewsRes.data ?? []) as Array<{ group_id: string; status: string }>);
  const release = releaseRes.error ? null : releaseRes.data;
  const statusByGroup = new Map(
    reviews.map((row) => [row.group_id, asReviewStatus(row.status)])
  );

  let releasedByName: string | null = null;
  if (release?.released_by) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", release.released_by)
      .maybeSingle();
    releasedByName = profile ? displayName(profile, release.released_by) : "Super-admin";
  }

  return {
    assessmentKey: KEYSTONE_ASSESSMENT_KEY,
    releasedAt: release?.released_at ?? null,
    firstReleasedAt: release?.first_released_at ?? null,
    releasedByName,
    releaseTargets: groups.map((group) => ({
      id: group.id,
      name: group.name,
      reviewStatus: statusByGroup.get(group.id) ?? null,
    })),
  };
}

export async function loadAdminAssessmentDesk() {
  const keystone = await loadAdminKeystoneRelease();
  return [keystoneDeskItem(keystone)];
}
