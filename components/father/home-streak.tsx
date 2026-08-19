"use client";

import { useEffect, useRef, useState } from "react";

import { useT } from "@/components/i18n/locale-provider";
import type { LedgerOutcome } from "@/lib/father/streak";
import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function weekLabel(t: ReturnType<typeof useT>, weeks: number) {
  if (weeks === 0) return t("father.home.startFirstWeek");
  return weeks === 1 ? t("father.home.streakWeek", { n: weeks }) : t("father.home.streakWeeks", { n: weeks });
}

function WeekCell({ outcome }: { outcome: LedgerOutcome | null }) {
  return (
    <span
      aria-hidden
      className={cn(
        "aspect-square w-full rounded-sm",
        outcome === "counted" && "bg-primary",
        outcome === "frozen" && "border border-border bg-transparent",
        outcome === "neutral" && "bg-muted",
        (outcome === "missed" || outcome == null) && "border border-transparent bg-transparent"
      )}
    />
  );
}

export function HomeStreakRow({
  weeks,
  longestWeeks,
  freezesRemaining,
  grid,
  justFinished = false,
}: {
  weeks: number;
  longestWeeks: number;
  freezesRemaining: number;
  grid: Array<{ weekStart: string; outcome: LedgerOutcome | null }>;
  justFinished?: boolean;
}) {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [lit, setLit] = useState(!justFinished || weeks === 0);

  useEffect(() => {
    if (!justFinished || weeks === 0) return;
    const frame = requestAnimationFrame(() => setLit(true));
    return () => cancelAnimationFrame(frame);
  }, [justFinished, weeks]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={cn(
          "flex min-h-11 w-full items-center gap-2.5 text-start",
          interactiveControlClassName
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            weeks > 0 ? "bg-primary" : "bg-muted-foreground"
          )}
        />
        <span className="min-w-0">
          <span
            className={cn(
              "block text-base font-medium text-foreground transition-opacity duration-300 ease-out",
              lit ? "opacity-100" : "opacity-50"
            )}
          >
            {weekLabel(t, weeks)}
          </span>
          {weeks > 0 ? (
            <span className="block text-sm text-muted-foreground">{t("father.home.inARow")}</span>
          ) : null}
        </span>
      </button>
      <dialog
        ref={dialogRef}
        className="fixed inset-x-4 bottom-4 top-auto mb-0 w-[calc(100%-2rem)] max-w-xl rounded-xl border border-border bg-card p-5 text-foreground shadow-none backdrop:bg-overlay"
      >
        <p className="text-base font-medium">{weekLabel(t, weeks)}</p>
        {weeks > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{t("father.home.inARow")}</p>
        ) : null}
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("father.home.longestStreak")}</p>
            <p className="text-base font-medium">
              {longestWeeks === 1
                ? t("father.home.streakWeek", { n: longestWeeks })
                : t("father.home.streakWeeks", { n: longestWeeks })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("father.home.freezesRemaining")}</p>
            <p className="text-base font-medium">{freezesRemaining}</p>
          </div>
        </div>
        <div
          dir="ltr"
          className="mt-4 grid grid-cols-12 gap-1"
          role="img"
          aria-label={t("father.home.streakGrid")}
        >
          {grid.map((cell) => (
            <WeekCell key={cell.weekStart} outcome={cell.outcome} />
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {t("father.home.streakRule")}
        </p>
        <form method="dialog" className="mt-5">
          <button
            type="submit"
            className={cn("text-sm text-muted-foreground underline underline-offset-4", interactiveControlClassName)}
          >
            {t("father.home.streakClose")}
          </button>
        </form>
      </dialog>
    </>
  );
}
