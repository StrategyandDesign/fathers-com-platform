import Link from "next/link";

import { FutureAssessmentsPanel } from "@/components/assessments/future-panel";
import { Flash } from "@/components/manager/flash";
import { KeystoneCompletedView } from "@/components/profile/keystone-completed-view";
import { buttonVariants } from "@/components/ui/button";
import { loadFatherAssessmentAccess, loadFatherAssignments } from "@/lib/assessments/data";
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
  const banner = <Flash error={flash.error} notice={flash.notice} />;

  if (profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("father.assessments.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("father.assessments.lead")}</p>
        </div>
        {banner}
        <KeystoneCompletedView
          profile={profile}
          draft={draft}
          canStartKeystone={access.canStartKeystone}
        />
        <FutureAssessmentsPanel assignments={assignments} />
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
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("father.assessments.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("father.assessments.lead")}</p>
      </div>
      {banner}

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
  );
}
