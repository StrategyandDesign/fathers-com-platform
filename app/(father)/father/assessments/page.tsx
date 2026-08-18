import Link from "next/link";

import { AssignedAssessmentList } from "@/components/assessments/assigned-list";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadFatherAssignments } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { startProfile } from "@/lib/father/profile-actions";
import { loadProfileState } from "@/lib/father/profile";
import { PROFILE_QUESTION_COUNT, answeredCount, firstUnanswered } from "@/lib/father/questions";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export default async function FatherAssessmentsPage() {
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const [assignments, { profile, draft }] = await Promise.all([
    loadFatherAssignments(user.id),
    loadProfileState(user.id),
  ]);
  const resumeAt = draft ? firstUnanswered(draft.answers) : 1;
  const answered = draft ? answeredCount(draft.answers) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("father.assessments.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("father.assessments.lead")}</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
        <p className={eyebrowClassName}>{t("father.profile.keystone")}</p>
        {profile ? (
          <>
            <p className="mt-4 text-muted-foreground">{t("father.profile.leadComplete")}</p>
            <Link
              href="/father/profile/results"
              className={cn(buttonVariants(), "mt-8 w-full min-h-11 sm:w-auto")}
            >
              {t("father.profile.viewResults")}
            </Link>
          </>
        ) : draft ? (
          <>
            <p className="mt-4 text-muted-foreground">
              {t("father.profile.progress", {
                n: resumeAt,
                total: PROFILE_QUESTION_COUNT,
                answered,
              })}
            </p>
            <Link
              href={`/father/profile/take?q=${resumeAt}`}
              className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full min-h-12 sm:w-auto")}
            >
              {t("father.home.continueProfile")}
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 text-muted-foreground">{t("father.profile.takeHint")}</p>
            <form action={startProfile} className="mt-8">
              <Button type="submit" size="lg" className="w-full min-h-12 sm:w-auto">
                {t("father.profile.takeCta")}
              </Button>
            </form>
          </>
        )}
      </section>

      {assignments.length > 0 ? (
        <AssignedAssessmentList assignments={assignments} quiet />
      ) : (
        <EmptyState
          framed={false}
          className="p-0"
          title={t("father.assessments.emptyTitle")}
        >
          {t("father.assessments.emptyBody")}
        </EmptyState>
      )}
    </div>
  );
}
