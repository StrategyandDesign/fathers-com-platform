import Link from "next/link";

import { AssessmentResultCard } from "@/components/assessments/assessment-result-card";
import { EarlierAssessmentResults } from "@/components/assessments/earlier-results";
import { FutureAssessmentsPanel } from "@/components/assessments/future-panel";
import { Flash } from "@/components/manager/flash";
import { KeystoneCompletedView } from "@/components/profile/keystone-completed-view";
import { buttonVariants } from "@/components/ui/button";
import { loadFatherAssessmentAccess, loadFatherAssignments } from "@/lib/assessments/data";
import { loadFatherFirstPartyCards } from "@/lib/assessments/first-party-data";
import {
  collectFatherAssessmentResults,
  openAssessmentWork,
  splitFeaturedAndArchive,
} from "@/lib/assessments/result-archive";
import { requireRole } from "@/lib/auth/session";
import { loadProfileState } from "@/lib/father/profile";
import { PROFILE_QUESTION_COUNT, answeredCount, firstUnanswered } from "@/lib/father/questions";
import { getI18n } from "@/lib/i18n/server";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function FatherAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const [assignments, { profile, draft }, access] = await Promise.all([
    loadFatherAssignments(user.id),
    loadProfileState(user.id),
    loadFatherAssessmentAccess(user.id),
  ]);
  const firstParty = await loadFatherFirstPartyCards({
    fatherId: user.id,
    groupIds: access.groupIds,
    homeGroupId: access.homeGroupId,
    availability: access.availability,
    reviews: access.reviews,
  });
  const results = collectFatherAssessmentResults({
    keystone: profile
      ? {
          id: profile.id,
          takenAt: profile.taken_at,
          determination: profile.primary_determination,
          edge: profile.primary_edge,
        }
      : null,
    firstParty,
    assignments,
  });
  const { featured, archive } = splitFeaturedAndArchive(results);
  const openWork = openAssessmentWork({ firstParty, assignments });
  const banner = <Flash error={flash.error} notice={flash.notice} />;
  const more = <FutureAssessmentsPanel assignments={openWork.assignments} firstParty={openWork.firstParty} />;
  const showKeystoneTake = Boolean(!profile && (draft || access.canStartKeystone));
  const resumeAt = draft ? firstUnanswered(draft.answers) : 1;
  const answered = draft ? answeredCount(draft.answers) : 0;
  const keystoneHref = draft ? `/father/profile/take?q=${resumeAt}` : "/father/profile";
  const keystoneStatus = draft
    ? t("father.profile.progress", {
        n: resumeAt,
        total: PROFILE_QUESTION_COUNT,
        answered,
      })
    : t("father.profile.takeHint");
  const keystoneAction = draft ? t("father.assessments.continue") : t("father.assessments.take");
  const keystoneTake = showKeystoneTake ? (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <Link
        href={keystoneHref}
        className={cn(
          "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
          interactiveSurfaceClassName
        )}
      >
        <div className="min-w-0">
          <p className="font-medium">{t("father.profile.keystone")}</p>
          <p className="text-sm text-muted-foreground">{keystoneStatus}</p>
        </div>
        <span className={cn(buttonVariants(), "pointer-events-none w-full sm:w-auto")}>
          {keystoneAction}
        </span>
      </Link>
    </section>
  ) : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("father.assessments.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("father.assessments.lead")}</p>
      </div>
      {banner}

      {featured?.kind === "keystone" && profile ? (
        <>
          <KeystoneCompletedView
            profile={profile}
            draft={draft}
            canStartKeystone={access.canStartKeystone}
            aside={more}
          />
          <EarlierAssessmentResults
            results={archive}
            profile={profile}
            draft={draft}
            canStartKeystone={access.canStartKeystone}
          />
        </>
      ) : featured ? (
        <>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)]">
            <AssessmentResultCard result={featured} featured />
            <div className="space-y-5">
              {keystoneTake}
              {more}
            </div>
          </div>
          <EarlierAssessmentResults
            results={archive}
            profile={profile}
            draft={draft}
            canStartKeystone={access.canStartKeystone}
          />
        </>
      ) : (
        <div
          className={
            showKeystoneTake
              ? "grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)]"
              : undefined
          }
        >
          {keystoneTake}
          {more}
        </div>
      )}
    </div>
  );
}
