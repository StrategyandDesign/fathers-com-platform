import Link from "next/link";
import { redirect } from "next/navigation";

import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { loadFatherAssessmentAccess } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { startProfile } from "@/lib/father/profile-actions";
import { loadProfileState } from "@/lib/father/profile";
import { PROFILE_QUESTION_COUNT, answeredCount, firstUnanswered } from "@/lib/father/questions";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

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
  const { t } = await getI18n();
  const [{ profile, draft }, access] = await Promise.all([
    loadProfileState(user.id),
    loadFatherAssessmentAccess(user.id),
  ]);

  if (profile) {
    const params = new URLSearchParams();
    if (flash.error) params.set("error", flash.error);
    if (flash.notice) params.set("notice", flash.notice);
    const query = params.toString();
    redirect(query ? `/father/assessments?${query}` : "/father/assessments");
  }

  const banner = <Flash error={flash.error} notice={flash.notice} />;
  const header = (
    <ProfilePageHeader
      title={t("father.profile.title")}
      lead={t("father.profile.lead")}
    />
  );

  const answered = draft ? answeredCount(draft.answers) : 0;
  const resumeAt = draft ? firstUnanswered(draft.answers) : 1;

  return (
    <div className="space-y-6">
      {banner}
      {header}
      <section className="max-w-xl rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
        <p className={eyebrowClassName}>
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
            className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full min-h-12 lg:w-auto")}
          >
            {t("common.continue")}
          </Link>
        ) : access.canStartKeystone ? (
          <form action={startProfile} className="mt-8">
            <Button type="submit" size="lg" className="w-full min-h-12 lg:w-auto">
              {t("father.profile.takeCta")}
            </Button>
          </form>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground">{t("father.assessments.unavailable")}</p>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          {t("father.profile.takeHint")}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("father.profile.howToAnswer")}
        </p>
      </section>
    </div>
  );
}
