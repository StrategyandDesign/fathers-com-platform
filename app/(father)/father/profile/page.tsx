import Link from "next/link";

import { AssignedAssessmentList } from "@/components/assessments/assigned-list";
import { Flash } from "@/components/manager/flash";
import { DimensionScores } from "@/components/profile/dimension-scores";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadFatherAssignments } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import { retakeProfile, startProfile } from "@/lib/father/profile-actions";
import { loadProfileState } from "@/lib/father/profile";
import { PROFILE_QUESTION_COUNT, answeredCount, firstUnanswered } from "@/lib/father/questions";
import { readStoredDimensionScores } from "@/lib/profile/score";
import { cn } from "@/lib/utils";

function ProfilePageHeader({
  title,
  lead,
}: {
  title: string;
  lead: string;
}) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{lead}</p>
    </div>
  );
}

export default async function FatherProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user } = await requireRole("father");
  const { t, locale } = await getI18n();
  const { profile, draft } = await loadProfileState(user.id);
  const customAssignments = await loadFatherAssignments(user.id);
  const banner = <Flash error={flash.error} notice={flash.notice} />;
  const header = (
    <ProfilePageHeader title={t("father.profile.title")} lead={t("father.profile.lead")} />
  );

  if (profile) {
    const scores = readStoredDimensionScores(profile.raw_scores, profile.full_results);
    return (
      <div className="space-y-6">
        {banner}
        {header}
        <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
            {t("father.profile.yourKeystone")}
          </p>
          <p className="mt-6 text-sm text-muted-foreground">{t("father.profile.primaryDetermination")}</p>
          <h2 className="font-heading mt-1 text-2xl font-semibold tracking-tight uppercase sm:text-3xl">
            {profile.primary_determination ?? t("common.complete")}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t("father.profile.primaryEdge", { edge: profile.primary_edge ?? t("common.emDash") })}
          </p>
          {scores ? <DimensionScores scores={scores} /> : null}
          <p className="mt-6 text-sm text-muted-foreground">
            {t("father.profile.lastProfile", { date: formatLongDate(profile.taken_at, locale) })}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/father/profile/results" className={cn(buttonVariants(), "w-full sm:w-auto")}>
              {t("father.profile.viewResults")}
            </Link>
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
            {t("father.profile.keystone")}
          </p>
          <p className="mt-4 text-muted-foreground">
            {t("father.profile.retakeLead")}
          </p>
          {draft ? (
            <Link
              href={`/father/profile/take?q=${firstUnanswered(draft.answers)}`}
              className={cn(buttonVariants(), "mt-8 w-full lg:w-auto")}
            >
              {t("father.profile.continueRetake")}
            </Link>
          ) : (
            <form action={retakeProfile} className="mt-8">
              <Button type="submit" className="w-full lg:w-auto">
                {t("father.profile.retake")}
              </Button>
            </form>
          )}
        </section>
        </div>
        <AssignedAssessmentList assignments={customAssignments} />
      </div>
    );
  }

  const answered = draft ? answeredCount(draft.answers) : 0;
  const resumeAt = draft ? firstUnanswered(draft.answers) : 1;

  return (
    <div className="space-y-6">
      {banner}
      {header}
      <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
          {t("father.profile.keystone")}
        </p>
        <p className="mt-4 text-muted-foreground">
          {draft
            ? t("father.profile.progress", {
                n: resumeAt,
                total: PROFILE_QUESTION_COUNT,
                answered,
              })
            : t("father.home.takeProfileBody")}
        </p>
        {draft ? (
          <Link
            href={`/father/profile/take?q=${resumeAt}`}
            className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full lg:w-auto")}
          >
            {t("common.continue")}
          </Link>
        ) : (
          <form action={startProfile} className="mt-8">
            <Button type="submit" size="lg" className="w-full lg:w-auto">
              {t("father.profile.takeCta")}
            </Button>
          </form>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          {t("father.profile.takeHint")}
        </p>
      </section>
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
          {t("father.profile.yourKeystone")}
        </p>
        <EmptyState
          framed={false}
          className="mt-2 p-0"
          title={t("father.profile.noResults")}
        >
          {t("father.profile.noResultsBody")}
        </EmptyState>
      </section>
      </div>
      <AssignedAssessmentList assignments={customAssignments} />
    </div>
  );
}
