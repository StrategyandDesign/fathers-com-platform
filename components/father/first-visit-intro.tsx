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
import { homePrimaryCtaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export function FirstVisitIntro({
  eligible,
  href,
  trainingTitle,
  total,
  completed,
  percent,
  coverSrc,
  children,
}: {
  eligible: boolean;
  href: string;
  trainingTitle: string;
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

  return (
    <div className="min-w-0 space-y-2">
      <p className={eyebrowClassName}>{t("father.home.startHere")}</p>
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="h-20 overflow-hidden bg-[#101510] sm:h-32 lg:h-40">
          <CoverPhoto src={coverSrc} />
        </div>
        <div className="space-y-5 p-4 sm:p-5 lg:p-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              {trainingTitle}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {t("father.home.startRhythm")}
            </p>
          </div>
          <Link
            href={href}
            onClick={markFathersIntroSeen}
            className={cn(buttonVariants({ variant: "default", size: "lg" }), homePrimaryCtaClassName)}
          >
            {t("father.home.startOverview")}
          </Link>
          {total > 0 ? (
            <div className="space-y-2">
              <ProgressBar value={percent} />
              <p className="text-sm text-muted-foreground">
                {t("father.home.sessionsComplete", { completed, total })}
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
