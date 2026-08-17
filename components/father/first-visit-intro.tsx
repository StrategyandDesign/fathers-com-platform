"use client";

import Link from "next/link";
import { useLayoutEffect, useState, type ReactNode } from "react";

import { CoverPhoto } from "@/components/brand/cover";
import { useT } from "@/components/i18n/locale-provider";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import {
  hasFathersIntroSeen,
  markFathersIntroSeen,
} from "@/lib/father/intro-seen";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export function FirstVisitIntro({
  eligible,
  href,
  trainingTitle,
  trainingDescription,
  sessionNumber,
  total,
  completed,
  percent,
  coverSrc,
  children,
}: {
  eligible: boolean;
  href: string;
  trainingTitle: string;
  trainingDescription?: string | null;
  sessionNumber: number;
  total: number;
  completed: number;
  percent: number;
  coverSrc?: string | null;
  children: ReactNode;
}) {
  const [showFull, setShowFull] = useState(eligible);
  const t = useT();

  useLayoutEffect(() => {
    if (!eligible) return;
    if (hasFathersIntroSeen()) {
      setShowFull(false);
    }
  }, [eligible]);

  if (!eligible || !showFull) return children;

  const sessionLine =
    total > 0
      ? t("father.home.sessionOf", { n: sessionNumber, total })
      : t("father.home.sessionN", { n: sessionNumber });

  return (
    <div className="min-w-0 space-y-2">
      <p className={eyebrowClassName}>{t("father.intro.welcome")}</p>
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="h-24 overflow-hidden bg-[#101510] sm:h-36 lg:h-44">
          <CoverPhoto src={coverSrc} />
        </div>
        <div className="space-y-5 p-4 sm:p-5 lg:p-6">
          <div>
            <p className={eyebrowClassName}>{sessionLine}</p>
            <h1 className="font-heading mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              {trainingTitle}
            </h1>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground sm:text-base">
              <p>
                {trainingDescription?.trim() ||
                  `This is ${trainingTitle}. Short sessions you can put to work the same night.`}
              </p>
              <p>{t("father.home.startRhythm")}</p>
            </div>
          </div>
          <div className="space-y-4">
            {total > 0 ? (
              <div className="space-y-2">
                <ProgressBar value={percent} />
                <p className="text-sm text-muted-foreground">
                  {t("father.home.sessionsComplete", { completed, total })}
                </p>
              </div>
            ) : null}
            <Link
              href={href}
              onClick={markFathersIntroSeen}
              className={cn(
                buttonVariants({ variant: "inverse", size: "lg" }),
                "w-full sm:w-auto"
              )}
            >
              {t("father.home.startOverview")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
