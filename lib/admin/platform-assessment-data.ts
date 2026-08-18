import { displayName } from "@/lib/manager/types";
import { createClient } from "@/lib/supabase/server";
import type { AdminReleaseTarget, AdminReviewStatus } from "@/lib/admin/types";
import {
  asDevelopmentStatus,
  type DevelopmentStatus,
} from "@/lib/admin/development";
import {
  isScoringMethod,
  parseInstrumentDraft,
  type InstrumentDraft,
  type ScoringMethod,
} from "@/lib/admin/platform-assessments";
import {
  fatherCanStartAssessment,
  leaderCanStartAssessment,
  primaryFatherGroupId,
} from "@/lib/assessments/availability";
import {
  loadAssessmentAvailability,
  loadOrganizationAssessmentReviews,
} from "@/lib/assessments/data";
import { reviewForGroup, type PlatformAssessmentRelease } from "@/lib/assessments/reviews";
import { loadManagerGroups } from "@/lib/manager/data";

function asReviewStatus(value: string | null | undefined): AdminReviewStatus | null {
  if (value === "pending" || value === "accepted" || value === "declined") return value;
  return null;
}

function missingRelation(error: { code?: string; message: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /platform_assessments|platform_assessment_/i.test(error.message)
  );
}

export type PlatformAssessmentRow = {
  id: string;
  slug: string;
  assessment_key: string;
  title: string;
  title_he: string | null;
  description: string | null;
  description_he: string | null;
  working_title: string | null;
  development_notes: string | null;
  development_status: DevelopmentStatus;
  scoring_method: ScoringMethod;
  scale_min: number;
  scale_max: number;
  published: boolean;
  previewed_at: string | null;
  last_edited_at: string | null;
  last_edited_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformAssessmentListItem = PlatformAssessmentRow & {
  questionCount: number;
  domainCount: number;
  releasedAt: string | null;
  firstReleasedAt: string | null;
  lastEditedByName: string | null;
};

export type PlatformAssessmentDetail = PlatformAssessmentRow & {
  instrument: InstrumentDraft;
  questionCount: number;
  lastEditedByName: string | null;
  releasedAt: string | null;
  firstReleasedAt: string | null;
  releasedByName: string | null;
  releaseTargets: AdminReleaseTarget[];
  attemptCount: number;
};

export type PublishedPlatformAssessment = {
  id: string;
  slug: string;
  assessment_key: string;
  title: string;
  title_he: string | null;
  description: string | null;
  description_he: string | null;
  questionCount: number;
  published: boolean;
};

export type PlatformAttemptRow = {
  id: string;
  assessment_id: string;
  father_id: string;
  status: "in_progress" | "completed";
  started_at: string;
  completed_at: string | null;
  overall_score: number | null;
  band_label: string | null;
  band_description: string | null;
  domain_scores: unknown;
};

export type FatherPlatformCard = {
  assessmentKey: string;
  assessmentId: string;
  title: string;
  titleHe: string | null;
  description: string | null;
  descriptionHe: string | null;
  questionCount: number;
  attempt: {
    id: string;
    status: "in_progress" | "completed";
    answeredCount: number;
    completedAt: string | null;
    overallScore: number | null;
    bandLabel: string | null;
  } | null;
  canStart: boolean;
};

function asAssessmentRow(row: Record<string, unknown>): PlatformAssessmentRow | null {
  if (typeof row.id !== "string" || typeof row.slug !== "string") return null;
  if (typeof row.assessment_key !== "string" || typeof row.title !== "string") return null;
  return {
    id: row.id,
    slug: row.slug,
    assessment_key: row.assessment_key,
    title: row.title,
    title_he: typeof row.title_he === "string" ? row.title_he : null,
    description: typeof row.description === "string" ? row.description : null,
    description_he: typeof row.description_he === "string" ? row.description_he : null,
    working_title: typeof row.working_title === "string" ? row.working_title : null,
    development_notes: typeof row.development_notes === "string" ? row.development_notes : null,
    development_status: asDevelopmentStatus(row.development_status),
    scoring_method: isScoringMethod(row.scoring_method) ? row.scoring_method : "weighted_mean",
    scale_min: typeof row.scale_min === "number" ? row.scale_min : 1,
    scale_max: typeof row.scale_max === "number" ? row.scale_max : 5,
    published: row.published === true,
    previewed_at: typeof row.previewed_at === "string" ? row.previewed_at : null,
    last_edited_at: typeof row.last_edited_at === "string" ? row.last_edited_at : null,
    last_edited_by: typeof row.last_edited_by === "string" ? row.last_edited_by : null,
    created_by: typeof row.created_by === "string" ? row.created_by : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

function instrumentFromRows(input: {
  domains: Array<{
    id: string;
    domain_key: string;
    title: string;
    title_he: string | null;
    description: string | null;
    weight: number | string;
    sort_order: number;
  }>;
  items: Array<{
    id: string;
    domain_id: string;
    prompt: string;
    prompt_he: string | null;
    reverse_scored: boolean;
    weight: number | string;
    sort_order: number;
  }>;
  bands: Array<{
    id: string;
    min_score: number | string;
    max_score: number | string;
    label: string;
    label_he: string | null;
    description: string | null;
    description_he: string | null;
    sort_order: number;
  }>;
}): InstrumentDraft {
  const itemsByDomain = new Map<string, typeof input.items>();
  for (const item of input.items) {
    const list = itemsByDomain.get(item.domain_id) ?? [];
    list.push(item);
    itemsByDomain.set(item.domain_id, list);
  }

  const parsed = parseInstrumentDraft({
    domains: [...input.domains]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((domain) => ({
        clientId: domain.id,
        key: domain.domain_key,
        title: domain.title,
        titleHe: domain.title_he ?? "",
        description: domain.description ?? "",
        weight: Number(domain.weight),
        items: [...(itemsByDomain.get(domain.id) ?? [])]
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((item) => ({
            clientId: item.id,
            prompt: item.prompt,
            promptHe: item.prompt_he ?? "",
            reverseScored: item.reverse_scored,
            weight: Number(item.weight),
          })),
      })),
    bands: [...input.bands]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((band) => ({
        clientId: band.id,
        minScore: Number(band.min_score),
        maxScore: Number(band.max_score),
        label: band.label,
        labelHe: band.label_he ?? "",
        description: band.description ?? "",
        descriptionHe: band.description_he ?? "",
      })),
  });

  if (typeof parsed === "string") {
    return { domains: [], bands: [] };
  }
  return parsed;
}

export async function loadAdminPlatformAssessments(): Promise<PlatformAssessmentListItem[]> {
  const supabase = await createClient();
  const [assessmentsRes, domainsRes, itemsRes, releasesRes] = await Promise.all([
    supabase.from("platform_assessments").select("*").order("updated_at", { ascending: false }),
    supabase.from("platform_assessment_domains").select("id, assessment_id"),
    supabase.from("platform_assessment_items").select("id, domain_id"),
    supabase.from("platform_assessment_releases").select("assessment_key, released_at, first_released_at"),
  ]);

  if (assessmentsRes.error) {
    if (missingRelation(assessmentsRes.error)) return [];
    throw assessmentsRes.error;
  }

  const rows = (assessmentsRes.data ?? [])
    .map((row) => asAssessmentRow(row as Record<string, unknown>))
    .filter((row): row is PlatformAssessmentRow => row !== null);

  const domainIdsByAssessment = new Map<string, string[]>();
  for (const domain of domainsRes.data ?? []) {
    const list = domainIdsByAssessment.get(domain.assessment_id) ?? [];
    list.push(domain.id);
    domainIdsByAssessment.set(domain.assessment_id, list);
  }
  const itemCountByDomain = new Map<string, number>();
  for (const item of itemsRes.data ?? []) {
    itemCountByDomain.set(item.domain_id, (itemCountByDomain.get(item.domain_id) ?? 0) + 1);
  }
  const releaseByKey = new Map(
    (releasesRes.data ?? []).map((row) => [
      row.assessment_key,
      {
        releasedAt: row.released_at as string | null,
        firstReleasedAt: row.first_released_at as string | null,
      },
    ])
  );

  const editorIds = [...new Set(rows.map((row) => row.last_edited_by).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (editorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", editorIds);
    for (const profile of profiles ?? []) {
      names.set(profile.id, displayName(profile, profile.id));
    }
  }

  return rows.map((row) => {
    const domainIds = domainIdsByAssessment.get(row.id) ?? [];
    const questionCount = domainIds.reduce(
      (sum, domainId) => sum + (itemCountByDomain.get(domainId) ?? 0),
      0
    );
    const release = releaseByKey.get(row.assessment_key);
    return {
      ...row,
      questionCount,
      domainCount: domainIds.length,
      releasedAt: release?.releasedAt ?? null,
      firstReleasedAt: release?.firstReleasedAt ?? null,
      lastEditedByName: row.last_edited_by ? names.get(row.last_edited_by) ?? null : null,
    };
  });
}

export async function loadAdminPlatformAssessment(
  id: string
): Promise<PlatformAssessmentDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (missingRelation(error)) return null;
    throw error;
  }
  if (!data) return null;
  const row = asAssessmentRow(data as Record<string, unknown>);
  if (!row) return null;

  const [domainsRes, bandsRes, groupsRes, reviewsRes, releaseRes, attemptsRes] = await Promise.all([
    supabase
      .from("platform_assessment_domains")
      .select("id, assessment_id, domain_key, title, title_he, description, weight, sort_order")
      .eq("assessment_id", id)
      .order("sort_order"),
    supabase
      .from("platform_assessment_bands")
      .select("id, min_score, max_score, label, label_he, description, description_he, sort_order")
      .eq("assessment_id", id)
      .order("sort_order"),
    supabase.from("groups").select("id, name").order("name"),
    supabase
      .from("organization_assessment_reviews")
      .select("group_id, assessment_key, status")
      .eq("assessment_key", row.assessment_key),
    supabase
      .from("platform_assessment_releases")
      .select("assessment_key, released_at, first_released_at, released_by")
      .eq("assessment_key", row.assessment_key)
      .maybeSingle(),
    supabase
      .from("platform_assessment_attempts")
      .select("id", { count: "exact", head: true })
      .eq("assessment_id", id),
  ]);

  if (domainsRes.error) throw domainsRes.error;
  if (bandsRes.error) throw bandsRes.error;

  const domainIds = (domainsRes.data ?? []).map((domain) => domain.id);
  const itemsRes =
    domainIds.length === 0
      ? { data: [] as Array<{
          id: string;
          domain_id: string;
          prompt: string;
          prompt_he: string | null;
          reverse_scored: boolean;
          weight: number | string;
          sort_order: number;
        }>, error: null }
      : await supabase
          .from("platform_assessment_items")
          .select("id, domain_id, prompt, prompt_he, reverse_scored, weight, sort_order")
          .in("domain_id", domainIds)
          .order("sort_order");
  if (itemsRes.error) throw itemsRes.error;

  const instrument = instrumentFromRows({
    domains: domainsRes.data ?? [],
    items: itemsRes.data ?? [],
    bands: bandsRes.data ?? [],
  });

  const reviews = reviewsRes.error
    ? []
    : ((reviewsRes.data ?? []) as Array<{ group_id: string; status: string }>);
  const statusByGroup = new Map(reviews.map((review) => [review.group_id, asReviewStatus(review.status)]));
  const groups = (groupsRes.data ?? []) as Array<{ id: string; name: string }>;
  const release = releaseRes.error ? null : releaseRes.data;

  let lastEditedByName: string | null = null;
  let releasedByName: string | null = null;
  const profileIds = [row.last_edited_by, release?.released_by].filter(Boolean) as string[];
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    const names = new Map(
      (profiles ?? []).map((profile) => [profile.id, displayName(profile, profile.id)])
    );
    lastEditedByName = row.last_edited_by ? names.get(row.last_edited_by) ?? null : null;
    releasedByName = release?.released_by ? names.get(release.released_by) ?? "Super-admin" : null;
  }

  return {
    ...row,
    instrument,
    questionCount: instrument.domains.reduce((sum, domain) => sum + domain.items.length, 0),
    lastEditedByName,
    releasedAt: release?.released_at ?? null,
    firstReleasedAt: release?.first_released_at ?? null,
    releasedByName,
    releaseTargets: groups.map((group) => ({
      id: group.id,
      name: group.name,
      reviewStatus: statusByGroup.get(group.id) ?? null,
    })),
    attemptCount: attemptsRes.count ?? 0,
  };
}

export async function loadPublishedPlatformAssessments(): Promise<PublishedPlatformAssessment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessments")
    .select("id, slug, assessment_key, title, title_he, description, description_he, published")
    .eq("published", true)
    .order("title");

  if (error) {
    if (missingRelation(error)) return [];
    throw error;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    slug: string;
    assessment_key: string;
    title: string;
    title_he: string | null;
    description: string | null;
    description_he: string | null;
    published: boolean;
  }>;
  if (rows.length === 0) return [];

  const { data: domains, error: domainsError } = await supabase
    .from("platform_assessment_domains")
    .select("id, assessment_id")
    .in("assessment_id", rows.map((row) => row.id));
  if (domainsError) throw domainsError;

  const domainIds = (domains ?? []).map((domain) => domain.id);
  const itemsRes =
    domainIds.length === 0
      ? { data: [] as Array<{ domain_id: string }>, error: null }
      : await supabase.from("platform_assessment_items").select("domain_id").in("domain_id", domainIds);
  if (itemsRes.error) throw itemsRes.error;

  const countByAssessment = new Map<string, number>();
  const assessmentByDomain = new Map((domains ?? []).map((domain) => [domain.id, domain.assessment_id]));
  for (const item of itemsRes.data ?? []) {
    const assessmentId = assessmentByDomain.get(item.domain_id);
    if (!assessmentId) continue;
    countByAssessment.set(assessmentId, (countByAssessment.get(assessmentId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...row,
    questionCount: countByAssessment.get(row.id) ?? 0,
  }));
}

export async function loadPublishedPlatformAssessmentByKey(assessmentKey: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessments")
    .select("*")
    .eq("assessment_key", assessmentKey)
    .maybeSingle();

  if (error) {
    if (missingRelation(error)) return null;
    throw error;
  }
  if (!data) return null;
  const row = asAssessmentRow(data as Record<string, unknown>);
  if (!row) return null;

  const [domainsRes, bandsRes] = await Promise.all([
    supabase
      .from("platform_assessment_domains")
      .select("id, assessment_id, domain_key, title, title_he, description, weight, sort_order")
      .eq("assessment_id", row.id)
      .order("sort_order"),
    supabase
      .from("platform_assessment_bands")
      .select("id, min_score, max_score, label, label_he, description, description_he, sort_order")
      .eq("assessment_id", row.id)
      .order("sort_order"),
  ]);
  if (domainsRes.error) throw domainsRes.error;
  if (bandsRes.error) throw bandsRes.error;

  const domainIds = (domainsRes.data ?? []).map((domain) => domain.id);
  const itemsRes =
    domainIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("platform_assessment_items")
          .select("id, domain_id, prompt, prompt_he, reverse_scored, weight, sort_order")
          .in("domain_id", domainIds)
          .order("sort_order");
  if (itemsRes.error) throw itemsRes.error;

  return {
    ...row,
    instrument: instrumentFromRows({
      domains: domainsRes.data ?? [],
      items: itemsRes.data ?? [],
      bands: bandsRes.data ?? [],
    }),
  };
}

export async function loadPlatformReleases(assessmentKeys: string[]) {
  if (assessmentKeys.length === 0) return [] as PlatformAssessmentRelease[];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessment_releases")
    .select("assessment_key, released_at, first_released_at, released_by")
    .in("assessment_key", assessmentKeys);
  if (error) {
    if (missingRelation(error)) return [];
    throw error;
  }
  return (data ?? []) as PlatformAssessmentRelease[];
}

export async function loadPlatformAttemptCounts(input: {
  assessmentIds: string[];
  fatherIds: string[];
}) {
  const counts = new Map<string, { completed: number; started: number }>();
  if (input.assessmentIds.length === 0 || input.fatherIds.length === 0) return counts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessment_attempts")
    .select("assessment_id, father_id, status")
    .in("assessment_id", input.assessmentIds)
    .in("father_id", input.fatherIds);
  if (error) {
    if (missingRelation(error)) return counts;
    throw error;
  }

  for (const row of data ?? []) {
    const current = counts.get(row.assessment_id) ?? { completed: 0, started: 0 };
    current.started += 1;
    if (row.status === "completed") current.completed += 1;
    counts.set(row.assessment_id, current);
  }
  return counts;
}

export async function loadUserPlatformAttempts(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessment_attempts")
    .select(
      "id, assessment_id, father_id, status, started_at, completed_at, overall_score, band_label, band_description, domain_scores"
    )
    .eq("father_id", userId);
  if (error) {
    if (missingRelation(error)) return [] as PlatformAttemptRow[];
    throw error;
  }
  return (data ?? []) as PlatformAttemptRow[];
}

export async function loadUserPlatformAttempt(userId: string, assessmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessment_attempts")
    .select(
      "id, assessment_id, father_id, status, started_at, completed_at, overall_score, band_label, band_description, domain_scores"
    )
    .eq("father_id", userId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  if (error) {
    if (missingRelation(error)) return null;
    throw error;
  }
  return (data as PlatformAttemptRow | null) ?? null;
}

export async function loadAttemptResponses(attemptId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessment_responses")
    .select("item_id, value")
    .eq("attempt_id", attemptId);
  if (error) {
    if (missingRelation(error)) return new Map<string, number>();
    throw error;
  }
  return new Map((data ?? []).map((row) => [row.item_id as string, Number(row.value)]));
}

export async function loadPlatformCompletionsByGroup(input: {
  assessmentId: string;
  groupIds: string[];
}) {
  const completedByGroup = new Map<string, number>();
  if (input.groupIds.length === 0) return completedByGroup;

  const supabase = await createClient();
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("father_id, group_id")
    .in("group_id", input.groupIds);
  if (membersError) throw membersError;

  const fatherIds = [...new Set((members ?? []).map((row) => row.father_id))];
  if (fatherIds.length === 0) return completedByGroup;

  const { data: attempts, error } = await supabase
    .from("platform_assessment_attempts")
    .select("father_id, status")
    .eq("assessment_id", input.assessmentId)
    .eq("status", "completed")
    .in("father_id", fatherIds);
  if (error) {
    if (missingRelation(error)) return completedByGroup;
    throw error;
  }

  const completed = new Set((attempts ?? []).map((row) => row.father_id));
  for (const member of members ?? []) {
    if (!completed.has(member.father_id)) continue;
    completedByGroup.set(member.group_id, (completedByGroup.get(member.group_id) ?? 0) + 1);
  }
  return completedByGroup;
}

export async function loadFatherPlatformCards(fatherId: string): Promise<FatherPlatformCard[]> {
  const published = await loadPublishedPlatformAssessments();
  if (published.length === 0) return [];

  const supabase = await createClient();
  const [membershipsRes, profileRes, attempts] = await Promise.all([
    supabase.from("group_members").select("group_id").eq("father_id", fatherId),
    supabase.from("profiles").select("home_group_id").eq("id", fatherId).maybeSingle(),
    loadUserPlatformAttempts(fatherId),
  ]);
  if (membershipsRes.error) throw membershipsRes.error;

  const groupIds = [...new Set((membershipsRes.data ?? []).map((row) => String(row.group_id)))];
  const homeGroupId =
    typeof profileRes.data?.home_group_id === "string" ? profileRes.data.home_group_id : null;
  const [availability, reviews, releases] = await Promise.all([
    loadAssessmentAvailability(groupIds),
    loadOrganizationAssessmentReviews(groupIds),
    loadPlatformReleases(published.map((row) => row.assessment_key)),
  ]);
  const groupId = primaryFatherGroupId(groupIds, homeGroupId);
  const attemptByAssessment = new Map(attempts.map((row) => [row.assessment_id, row]));
  const releaseByKey = new Map(releases.map((row) => [row.assessment_key, row]));

  const cards: FatherPlatformCard[] = [];
  for (const row of published) {
    const attempt = attemptByAssessment.get(row.id) ?? null;
    const review = groupId ? reviewForGroup(reviews, groupId, row.assessment_key) : null;
    const canStart = fatherCanStartAssessment({
      rows: availability,
      groupIds,
      homeGroupId,
      assessmentKey: row.assessment_key,
      hasProgress: Boolean(attempt),
      release: releaseByKey.get(row.assessment_key) ?? null,
      reviewStatus: review?.status ?? null,
    });
    if (!canStart && !attempt) continue;
    cards.push({
      assessmentKey: row.assessment_key,
      assessmentId: row.id,
      title: row.title,
      titleHe: row.title_he,
      description: row.description,
      descriptionHe: row.description_he,
      questionCount: row.questionCount,
      canStart,
      attempt: attempt
        ? {
            id: attempt.id,
            status: attempt.status,
            answeredCount: 0,
            completedAt: attempt.completed_at,
            overallScore: attempt.overall_score,
            bandLabel: attempt.band_label,
          }
        : null,
    });
  }
  return cards;
}

export async function loadLeaderPlatformCards(managerId: string): Promise<FatherPlatformCard[]> {
  const published = await loadPublishedPlatformAssessments();
  if (published.length === 0) return [];

  const groups = await loadManagerGroups(managerId);
  const groupIds = groups.map((group) => group.id);
  const [availability, reviews, releases, attempts] = await Promise.all([
    loadAssessmentAvailability(groupIds),
    loadOrganizationAssessmentReviews(groupIds),
    loadPlatformReleases(published.map((row) => row.assessment_key)),
    loadUserPlatformAttempts(managerId),
  ]);
  const attemptByAssessment = new Map(attempts.map((row) => [row.assessment_id, row]));
  const releaseByKey = new Map(releases.map((row) => [row.assessment_key, row]));

  const cards: FatherPlatformCard[] = [];
  for (const row of published) {
    const attempt = attemptByAssessment.get(row.id) ?? null;
    const canStart = leaderCanStartAssessment({
      rows: availability,
      groupIds,
      assessmentKey: row.assessment_key,
      hasProgress: Boolean(attempt),
      release: releaseByKey.get(row.assessment_key) ?? null,
      reviewStatusForGroup: (groupId) =>
        reviewForGroup(reviews, groupId, row.assessment_key)?.status ?? null,
    });
    if (!canStart && !attempt) continue;
    cards.push({
      assessmentKey: row.assessment_key,
      assessmentId: row.id,
      title: row.title,
      titleHe: row.title_he,
      description: row.description,
      descriptionHe: row.description_he,
      questionCount: row.questionCount,
      canStart,
      attempt: attempt
        ? {
            id: attempt.id,
            status: attempt.status,
            answeredCount: 0,
            completedAt: attempt.completed_at,
            overallScore: attempt.overall_score,
            bandLabel: attempt.band_label,
          }
        : null,
    });
  }
  return cards;
}
