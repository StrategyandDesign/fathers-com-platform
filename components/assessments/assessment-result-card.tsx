import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { FatherAssessmentResult } from "@/lib/assessments/result-archive";
import { formatShortDateTime, getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export async function AssessmentResultCard({
  result,
  featured = false,
}: {
  result: FatherAssessmentResult;
  featured?: boolean;
}) {
  const { t, locale } = await getI18n();
  const completedOn = formatShortDateTime(result.completedAt, locale);
  const eyebrow =
    result.rewardKind === "designation"
      ? t("father.assessments.youEarned")
      : result.rewardKind === "determination"
        ? t("father.profile.primaryDetermination")
        : t("father.assessments.awardRecord");

  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5",
        featured ? "border-primary/30" : "border-border"
      )}
    >
      {featured ? (
        <p className={eyebrowClassName}>{t("father.assessments.latestResult")}</p>
      ) : null}
      <p className={cn(eyebrowClassName, featured && "mt-3")}>{eyebrow}</p>
      {result.rewardLabel ? (
        <h2
          className={cn(
            "font-heading mt-2 font-semibold tracking-tight",
            featured ? "text-2xl sm:text-3xl" : "text-xl"
          )}
        >
          {result.rewardLabel}
        </h2>
      ) : (
        <h2 className="font-heading mt-2 text-xl font-semibold tracking-tight">{result.title}</h2>
      )}
      {result.rewardKind === "designation" ? (
        <p className="mt-2 text-sm text-foreground">
          {t("father.assessments.designationOn", { title: result.title })}
        </p>
      ) : result.rewardLabel ? (
        <p className="mt-2 text-sm text-muted-foreground">{result.title}</p>
      ) : null}
      {result.score ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("father.assessments.scoreOf", {
            score: result.score.value,
            max: result.score.max,
          })}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-muted-foreground">
        {t("father.assessments.completedOn", { date: completedOn })}
      </p>
      <div className="mt-5">
        <Link
          href={result.href}
          className={cn(
            buttonVariants({ variant: featured ? "default" : "outline" }),
            "w-full min-h-11 sm:w-auto"
          )}
        >
          {t("father.assessments.view")}
        </Link>
      </div>
    </section>
  );
}
