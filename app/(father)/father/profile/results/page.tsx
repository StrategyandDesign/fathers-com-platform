import Link from "next/link";
import { redirect } from "next/navigation";

import { DimensionScores } from "@/components/profile/dimension-scores";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { loadLatestProfile } from "@/lib/father/profile";
import { translateThemeLabel, translateThemeMeaning } from "@/lib/i18n/flash";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import { readStoredDimensionScores } from "@/lib/profile/score";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export default async function FatherProfileResultsPage() {
  const { user } = await requireRole("father");
  const { t, locale } = await getI18n();
  const profile = await loadLatestProfile(user.id);

  if (!profile) {
    redirect("/father/profile");
  }

  const scores = readStoredDimensionScores(profile.raw_scores, profile.full_results);
  const determinationLabel = translateThemeLabel(profile.primary_determination, t);
  const edgeLabel = translateThemeLabel(profile.primary_edge, t);
  const determinationMeaning = translateThemeMeaning(profile.primary_determination, t);
  const edgeMeaning = translateThemeMeaning(profile.primary_edge, t);

  return (
    <div className="mx-auto max-w-2xl">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
        <p className="text-sm font-medium text-foreground">
          {t("father.profile.resultsComplete")}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          {t("father.profile.resultsLead")}
        </p>

        <div className="mt-8 space-y-3">
          <p className={eyebrowClassName}>{t("father.profile.primaryDetermination")}</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight uppercase lg:text-3xl">
            {determinationLabel}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            {t("father.profile.determinationWhat")}
          </p>
          {determinationMeaning ? (
            <p className="text-sm leading-6 text-foreground sm:text-base">{determinationMeaning}</p>
          ) : null}
        </div>

        <div className="mt-8 space-y-3">
          <p className={eyebrowClassName}>{t("father.home.primaryEdge")}</p>
          <h2 className="font-heading text-xl font-semibold tracking-tight uppercase sm:text-2xl">
            {edgeLabel}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            {t("father.profile.edgeWhat")}
          </p>
          {edgeMeaning ? (
            <p className="text-sm leading-6 text-foreground sm:text-base">{edgeMeaning}</p>
          ) : null}
        </div>

        <div className="mt-8 space-y-3">
          <p className="text-sm font-medium">{t("father.profile.useThisTitle")}</p>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            {t("father.profile.useThis1")}
          </p>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            {t("father.profile.useThis2")}
          </p>
        </div>

        {scores ? (
          <div className="mt-8">
            <p className="text-sm leading-6 text-muted-foreground">
              {t("father.profile.scoresLead")}
            </p>
            <DimensionScores scores={scores} className="mt-5 space-y-6" />
          </div>
        ) : null}

        <p className="mt-8 text-sm text-muted-foreground">
          {t("father.profile.resultsCompleted", {
            date: formatLongDate(profile.taken_at, locale),
          })}
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          {t("father.profile.resultsRetakeLead")}
        </p>
        <div className="mt-8 space-y-4">
          <Link href="/father" className={cn(buttonVariants({ size: "lg" }), "w-full min-h-12")}>
            {t("father.profile.goHome")}
          </Link>
          <Link
            href="/father/profile"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full min-h-11 text-sm text-muted-foreground"
            )}
          >
            {t("father.profile.backToProfile")}
          </Link>
        </div>
      </section>
    </div>
  );
}
