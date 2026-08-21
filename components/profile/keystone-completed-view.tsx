import type { ReactNode } from "react";
import Link from "next/link";

import { DimensionScores } from "@/components/profile/dimension-scores";
import { Button, buttonVariants } from "@/components/ui/button";
import { retakeProfile } from "@/lib/father/profile-actions";
import type { FatherProfileResult, ProfileDraft } from "@/lib/father/profile";
import { firstUnanswered } from "@/lib/father/questions";
import { translateThemeLabel } from "@/lib/i18n/flash";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import type { Translate } from "@/lib/i18n/translate";
import { readStoredDimensionScores } from "@/lib/profile/score";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export async function KeystoneCompletedView({
  profile,
  draft,
  canStartKeystone,
  aside,
  variant = "featured",
}: {
  profile: FatherProfileResult;
  draft: ProfileDraft | null;
  canStartKeystone: boolean;
  aside?: ReactNode;
  variant?: "featured" | "archive";
}) {
  const { t, locale } = await getI18n();
  const scores = readStoredDimensionScores(profile.raw_scores, profile.full_results);
  const completedOn = formatLongDate(profile.taken_at, locale);

  if (variant === "archive") {
    return (
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <p className={eyebrowClassName}>{t("father.profile.keystone")}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("father.profile.primaryDetermination")}
        </p>
        <h3 className="font-heading mt-1 text-xl font-semibold tracking-tight uppercase">
          {translateThemeLabel(profile.primary_determination, t)}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("father.profile.primaryEdge", {
            edge: translateThemeLabel(profile.primary_edge, t),
          })}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("father.profile.lastProfile", { date: completedOn })}
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/father/profile/results"
            className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-11 sm:w-auto")}
          >
            {t("father.profile.viewResults")}
          </Link>
          <KeystoneRetakeAction draft={draft} canStartKeystone={canStartKeystone} t={t} />
        </div>
      </section>
    );
  }

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
          {t("father.profile.lastProfile", { date: completedOn })}
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
        {aside}
        <section className="rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch">
            <div className="min-w-0">
              <p className={eyebrowClassName}>{t("father.profile.keystone")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("father.profile.retakeLead")}</p>
            </div>
            <KeystoneRetakeAction
              draft={draft}
              canStartKeystone={canStartKeystone}
              t={t}
              fullWidth
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function KeystoneRetakeAction({
  draft,
  canStartKeystone,
  t,
  fullWidth = false,
}: {
  draft: ProfileDraft | null;
  canStartKeystone: boolean;
  t: Translate;
  fullWidth?: boolean;
}) {
  if (draft) {
    return (
      <Link
        href={`/father/profile/take?q=${firstUnanswered(draft.answers)}`}
        className={cn(
          buttonVariants(),
          fullWidth ? "w-full min-h-11 shrink-0 sm:w-auto lg:w-full" : "w-full min-h-11 sm:w-auto"
        )}
      >
        {t("father.profile.continueRetake")}
      </Link>
    );
  }
  if (canStartKeystone) {
    return (
      <form action={retakeProfile} className={fullWidth ? "w-full shrink-0 sm:w-auto lg:w-full" : "w-full sm:w-auto"}>
        <Button type="submit" className={fullWidth ? "w-full min-h-11 sm:w-auto lg:w-full" : "w-full min-h-11 sm:w-auto"}>
          {t("father.profile.retake")}
        </Button>
      </form>
    );
  }
  return <p className="text-sm text-muted-foreground">{t("father.assessments.unavailable")}</p>;
}
