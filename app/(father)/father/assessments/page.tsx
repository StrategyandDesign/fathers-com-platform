import Link from "next/link";

import { FutureAssessmentsPanel } from "@/components/assessments/future-panel";
import { Flash } from "@/components/manager/flash";
import { KeystoneCompletedView } from "@/components/profile/keystone-completed-view";
import { Button, buttonVariants } from "@/components/ui/button";
import { loadFatherAssessmentAccess, loadFatherAssignments } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { loadFatherHome } from "@/lib/father/data";
import { startProfile } from "@/lib/father/profile-actions";
import { loadProfileHistory, loadProfileState } from "@/lib/father/profile";
import {
  PROFILE_SECTION_COUNT,
  firstUnanswered,
  profileSectionForQuestion,
} from "@/lib/father/questions";
import { getI18n } from "@/lib/i18n/server";
import { suggestKeystoneTraining } from "@/lib/profile/suggest-training";
import { cn } from "@/lib/utils";

export default async function FatherAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const [assignments, { profile, draft }, history, access, home] = await Promise.all([
    loadFatherAssignments(user.id),
    loadProfileState(user.id),
    loadProfileHistory(user.id, 2),
    loadFatherAssessmentAccess(user.id),
    loadFatherHome(user.id),
  ]);
  const banner = <Flash error={flash.error} notice={flash.notice} />;
  const suggested = profile
    ? suggestKeystoneTraining(
        profile.primary_determination,
        home.trainingCards.map((card) => card.training)
      )
    : null;

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
          previousTakenAt={history[1]?.taken_at}
          draft={draft}
          canStartKeystone={access.canStartKeystone}
          suggestedTraining={suggested}
          trainingHref={suggested ? `/father/trainings/${suggested.id}` : null}
        />
        <FutureAssessmentsPanel assignments={assignments} />
      </div>
    );
  }

  const showKeystone = Boolean(draft || access.canStartKeystone);
  const resumeAt = draft ? firstUnanswered(draft.answers) : 1;
  const part = profileSectionForQuestion(resumeAt).index;
  const keystoneStatus = draft
    ? t("father.profile.progress", { n: part, total: PROFILE_SECTION_COUNT })
    : t("father.profile.takeHint");
  const keystoneAction = draft
    ? t("father.profile.continuePart")
    : t("father.profile.takeCta");

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
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="font-medium">{t("father.profile.keystone")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("father.profile.lead")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{keystoneStatus}</p>
          {draft ? (
            <Link
              href={`/father/profile/take?q=${resumeAt}`}
              className={cn(buttonVariants(), "mt-5 w-full min-h-11 sm:w-auto")}
            >
              {keystoneAction}
            </Link>
          ) : (
            <form action={startProfile} className="mt-5">
              <Button type="submit" className="w-full min-h-11 sm:w-auto">
                {keystoneAction}
              </Button>
            </form>
          )}
        </section>
      ) : null}

      <FutureAssessmentsPanel assignments={assignments} />
    </div>
  );
}
