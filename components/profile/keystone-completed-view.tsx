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
}: {
  profile: FatherProfileResult;
  draft: ProfileDraft | null;
  canStartKeystone: boolean;
}) {
  const { t, locale } = await getI18n();
  const scores = readStoredDimensionScores(profile.raw_scores, profile.full_results);

  return (
    <>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("father.profile.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("father.profile.leadComplete")}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
          <p className={eyebrowClassName}>{t("father.profile.yourKeystone")}</p>
          <p className="mt-6 text-sm text-muted-foreground">
            {t("father.profile.primaryDetermination")}
          </p>
          <h2 className="font-heading mt-1 text-2xl font-semibold tracking-tight uppercase sm:text-3xl">
            {translateThemeLabel(profile.primary_determination, t)}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t("father.profile.primaryEdge", {
              edge: translateThemeLabel(profile.primary_edge, t),
            })}
          </p>
          {scores ? <DimensionScores scores={scores} /> : null}
          <p className="mt-6 text-sm text-muted-foreground">
            {t("father.profile.lastProfile", { date: formatLongDate(profile.taken_at, locale) })}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
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
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
          <p className={eyebrowClassName}>{t("father.profile.keystone")}</p>
          <p className="mt-4 text-muted-foreground">{t("father.profile.retakeLead")}</p>
          {draft ? (
            <Link
              href={`/father/profile/take?q=${firstUnanswered(draft.answers)}`}
              className={cn(buttonVariants(), "mt-8 w-full min-h-11 lg:w-auto")}
            >
              {t("father.profile.continueRetake")}
            </Link>
          ) : canStartKeystone ? (
            <form action={retakeProfile} className="mt-8">
              <Button type="submit" variant="outline" className="w-full min-h-11 lg:w-auto">
                {t("father.profile.retake")}
              </Button>
            </form>
          ) : (
            <p className="mt-8 text-sm text-muted-foreground">
              {t("father.assessments.unavailable")}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
