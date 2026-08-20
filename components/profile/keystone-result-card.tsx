import Link from "next/link";

import { DimensionScores } from "@/components/profile/dimension-scores";
import { KeystoneKeepCopy } from "@/components/profile/keystone-keep-copy";
import { translateThemeLabel, translateThemeMeaning } from "@/lib/i18n/flash";
import { formatLongDate } from "@/lib/i18n/dates";
import type { Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/translate";
import { readStoredDimensionScores } from "@/lib/profile/score";
import type { CatalogTrainingRef } from "@/lib/profile/suggest-training";
import type { FatherProfileResult } from "@/lib/father/profile";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export function KeystoneResultCard({
  profile,
  previousTakenAt,
  suggestedTraining,
  trainingHref,
  showMeanings = false,
  t,
  locale,
}: {
  profile: FatherProfileResult;
  previousTakenAt?: string | null;
  suggestedTraining?: CatalogTrainingRef | null;
  trainingHref?: string | null;
  showMeanings?: boolean;
  t: Translate;
  locale: Locale;
}) {
  const scores = readStoredDimensionScores(profile.raw_scores, profile.full_results);
  const date = formatLongDate(profile.taken_at, locale);
  const determinationLabel = translateThemeLabel(profile.primary_determination, t);
  const edgeLabel = translateThemeLabel(profile.primary_edge, t);
  const determinationMeaning = showMeanings
    ? translateThemeMeaning(profile.primary_determination, t)
    : "";
  const edgeMeaning = showMeanings ? translateThemeMeaning(profile.primary_edge, t) : "";

  return (
    <section className="keystone-print-root rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
      <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
        {t("father.profile.resultsComplete", { date })}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("father.profile.resultsIn")}</p>
      {previousTakenAt ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("father.profile.lastTime", { date: formatLongDate(previousTakenAt, locale) })}
        </p>
      ) : null}

      <div className="mt-8 space-y-3">
        <p className={eyebrowClassName}>{t("father.profile.primaryDetermination")}</p>
        <p className="font-display text-3xl font-semibold tracking-tight uppercase sm:text-4xl">
          {determinationLabel}
        </p>
        {showMeanings ? (
          <>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              {t("father.profile.determinationWhat")}
            </p>
            {determinationMeaning ? (
              <p className="text-sm leading-6 text-foreground sm:text-base">{determinationMeaning}</p>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-8 space-y-3">
        <p className={eyebrowClassName}>{t("father.home.primaryEdge")}</p>
        <p className="font-display text-xl font-semibold tracking-tight uppercase sm:text-2xl">
          {edgeLabel}
        </p>
        {showMeanings ? (
          <>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              {t("father.profile.edgeWhat")}
            </p>
            {edgeMeaning ? (
              <p className="text-sm leading-6 text-foreground sm:text-base">{edgeMeaning}</p>
            ) : null}
          </>
        ) : null}
      </div>

      {scores ? <DimensionScores scores={scores} /> : null}

      {suggestedTraining ? (
        <p className="mt-8 text-sm leading-6 text-muted-foreground">
          {t("father.profile.fitsTrainingLead")}{" "}
          {trainingHref ? (
            <Link href={trainingHref} className="underline underline-offset-4">
              {suggestedTraining.title}
            </Link>
          ) : (
            suggestedTraining.title
          )}
          .
        </p>
      ) : null}

      <p className="mt-8 text-sm text-muted-foreground">
        {t("father.profile.lastProfile", { date })}
      </p>
      <div className="mt-5 print:hidden">
        <KeystoneKeepCopy />
      </div>
    </section>
  );
}
