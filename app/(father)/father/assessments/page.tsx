import Link from "next/link";

import { FutureAssessmentsPanel } from "@/components/assessments/future-panel";
import { Flash } from "@/components/manager/flash";
import { KeystoneCompletedView } from "@/components/profile/keystone-completed-view";
import { buttonVariants } from "@/components/ui/button";
import { loadFatherAssessmentAccess, loadFatherAssignments } from "@/lib/assessments/data";
import { firstPartyTakePath } from "@/lib/assessments/first-party";
import {
  loadFatherFirstPartyCards,
  type FatherFirstPartyCard,
} from "@/lib/assessments/first-party-data";
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
  const banner = <Flash error={flash.error} notice={flash.notice} />;

  if (profile) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("father.assessments.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("father.assessments.lead")}</p>
        </div>
        {banner}
        <KeystoneCompletedView
          profile={profile}
          draft={draft}
          canStartKeystone={access.canStartKeystone}
          aside={<FutureAssessmentsPanel assignments={assignments} />}
        />
        {firstParty.length > 0 ? (
          <div className="grid gap-4">
            {firstParty.map((item) => (
              <FirstPartyAssessmentLink key={item.key} item={item} t={t} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const showKeystone = Boolean(draft || access.canStartKeystone);
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("father.assessments.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("father.assessments.lead")}</p>
      </div>
      {banner}

      <div
        className={
          showKeystone
            ? "grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)]"
            : undefined
        }
      >
        {showKeystone ? (
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
        ) : null}

        <FutureAssessmentsPanel assignments={assignments} />
      </div>
      {firstParty.length > 0 ? (
        <div className="grid gap-4">
          {firstParty.map((item) => (
            <FirstPartyAssessmentLink key={item.key} item={item} t={t} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FirstPartyAssessmentLink({
  item,
  t,
}: {
  item: FatherFirstPartyCard;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const completed = Boolean(item.attempt?.completedAt);
  const inProgress = Boolean(item.attempt && !item.attempt.completedAt);
  const href = firstPartyTakePath(item.key);
  const status = completed
    ? t("father.assessments.completed")
    : inProgress
      ? t("father.assessments.inProgress")
      : t("father.assessments.notStarted");
  const action = completed
    ? t("father.assessments.view")
    : inProgress
      ? t("father.assessments.continue")
      : t("father.assessments.take");

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <Link
        href={href}
        className={cn(
          "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
          interactiveSurfaceClassName
        )}
      >
        <div className="min-w-0">
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-muted-foreground">{status}</p>
        </div>
        <span className={cn(buttonVariants(), "pointer-events-none w-full sm:w-auto")}>
          {action}
        </span>
      </Link>
    </section>
  );
}
