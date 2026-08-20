import type { ReactNode } from "react";
import Link from "next/link";

import { DimensionScores } from "@/components/profile/dimension-scores";
import { Button, buttonVariants } from "@/components/ui/button";
import { retakeProfile } from "@/lib/father/profile-actions";
import type { FatherProfileResult, ProfileDraft } from "@/lib/father/profile";
import { firstUnanswered } from "@/lib/father/questions";
import { translateThemeLabel } from "@/lib/i18n/flash";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import { readStoredDimensionScores } from "@/lib/profile/score";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export async function KeystoneCompletedView({
  profile,
  draft,
  canStartKeystone,
  aside,
}: {
  profile: FatherProfileResult;
  draft: ProfileDraft | null;
  canStartKeystone: boolean;
  aside?: ReactNode;
}) {
  const { t, locale } = await getI18n();
  const scores = readStoredDimensionScores(profile.raw_scores, profile.full_results);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)]">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <p className={eyebrowClassName}>{t("father.profile.yourKeystone")}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("father.profile.primaryDetermination")}
        </p>
        <h2 className="font-heading mt-1 text-2xl font-semibold tracking-tight uppercase sm:text-3xl">
          {translateThemeLabel(profile.primary_determination, t)}
        </h2>
        <p className="mt-3 text-muted-foreground">
          {t("father.profile.primaryEdge", {
            edge: translateThemeLabel(profile.primary_edge, t),
          })}
        </p>
        {scores ? <DimensionScores scores={scores} /> : null}
        <p className="mt-5 text-sm text-muted-foreground">
          {t("father.profile.lastProfile", { date: formatLongDate(profile.taken_at, locale) })}
        </p>
        <div className="mt-5">
          <Link
            href="/father/profile/results"
            className={cn(
              buttonVariants({ variant: draft ? "outline" : "default" }),
              "w-full min-h-11 sm:w-auto"
            )}
          >
            {t("father.profile.viewResults")}
          </Link>
        </div>
      </section>

      <div className="space-y-5">
        <section className="rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch">
            <div className="min-w-0">
              <p className={eyebrowClassName}>{t("father.profile.keystone")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("father.profile.retakeLead")}</p>
            </div>
            {draft ? (
              <Link
                href={`/father/profile/take?q=${firstUnanswered(draft.answers)}`}
                className={cn(buttonVariants(), "w-full min-h-11 shrink-0 sm:w-auto lg:w-full")}
              >
                {t("father.profile.continueRetake")}
              </Link>
            ) : canStartKeystone ? (
              <form action={retakeProfile} className="w-full shrink-0 sm:w-auto lg:w-full">
                <Button type="submit" variant="outline" className="w-full min-h-11 sm:w-auto lg:w-full">
                  {t("father.profile.retake")}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">{t("father.assessments.unavailable")}</p>
            )}
          </div>
        </section>
        {aside}
      </div>
    </div>
  );
}
