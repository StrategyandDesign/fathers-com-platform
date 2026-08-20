import Link from "next/link";

import { KeystoneResultCard } from "@/components/profile/keystone-result-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { retakeProfile } from "@/lib/father/profile-actions";
import type { FatherProfileResult, ProfileDraft } from "@/lib/father/profile";
import { firstUnanswered } from "@/lib/father/questions";
import { getI18n } from "@/lib/i18n/server";
import type { CatalogTrainingRef } from "@/lib/profile/suggest-training";
import { cn } from "@/lib/utils";

export async function KeystoneCompletedView({
  profile,
  previousTakenAt,
  draft,
  canStartKeystone,
  suggestedTraining,
  trainingHref,
}: {
  profile: FatherProfileResult;
  previousTakenAt?: string | null;
  draft: ProfileDraft | null;
  canStartKeystone: boolean;
  suggestedTraining?: CatalogTrainingRef | null;
  trainingHref?: string | null;
}) {
  const { t, locale } = await getI18n();

  return (
    <div className="space-y-6">
      <KeystoneResultCard
        profile={profile}
        previousTakenAt={previousTakenAt}
        suggestedTraining={suggestedTraining}
        trainingHref={trainingHref}
        t={t}
        locale={locale}
      />

      <div className="flex flex-col items-stretch gap-3 print:hidden sm:items-start">
        <Link
          href="/father/profile/results"
          className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-11 sm:w-auto")}
        >
          {t("father.profile.viewResults")}
        </Link>
        {draft ? (
          <Link
            href={`/father/profile/take?q=${firstUnanswered(draft.answers)}`}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full min-h-11 text-sm text-muted-foreground sm:w-auto"
            )}
          >
            {t("father.profile.continueRetake")}
          </Link>
        ) : canStartKeystone ? (
          <form action={retakeProfile}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full min-h-11 text-sm text-muted-foreground sm:w-auto"
            >
              {t("father.profile.retake")}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">{t("father.assessments.unavailable")}</p>
        )}
      </div>
    </div>
  );
}
