"use client";

import { useEffect, useRef, useState } from "react";

import { useT } from "@/components/i18n/locale-provider";
import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function HomeStreakRow({
  weeks,
  justFinished = false,
}: {
  weeks: number;
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

  const label =
    weeks === 0
      ? t("father.home.startFirstWeek")
      : weeks === 1
        ? t("father.home.streakWeek", { n: weeks })
        : t("father.home.streakWeeks", { n: weeks });

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
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground" />
        <span className="min-w-0">
          <span
            className={cn(
              "block text-base font-medium text-foreground transition-opacity duration-300 ease-out",
              lit ? "opacity-100" : "opacity-50"
            )}
          >
            {label}
          </span>
          {weeks > 0 ? (
            <span className="block text-sm text-muted-foreground">{t("father.home.inARow")}</span>
          ) : null}
        </span>
      </button>
      <dialog
        ref={dialogRef}
        className="fixed inset-x-4 bottom-4 top-auto mb-0 w-[calc(100%-2rem)] max-w-xl rounded-xl border border-border bg-card p-5 text-foreground shadow-none backdrop:bg-black/50"
      >
        <p className="text-base font-medium">
          {weeks === 0
            ? t("father.home.startFirstWeek")
            : weeks === 1
              ? t("father.home.streakWeek", { n: weeks })
              : t("father.home.streakWeeks", { n: weeks })}
        </p>
        {weeks > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{t("father.home.inARow")}</p>
        ) : null}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
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
