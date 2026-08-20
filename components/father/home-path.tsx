import Link from "next/link";

import { CoverPhoto } from "@/components/brand/cover";
import { HomeEarnedRow, type HomeEarnedMark } from "@/components/father/home-earned";
import { homeTrainingLabel } from "@/lib/father/home";
import type { Translate } from "@/lib/i18n/translate";
import { trainingContinueHref } from "@/lib/father/training-door";
import { type Session, type SessionProgress, type Training } from "@/lib/father/types";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export type HomeShelfItem = {
  training: Training;
  completed: number;
  total: number;
  gated: boolean;
  next?: Session;
  nextProgress: SessionProgress | null;
  sessionDots?: Array<{ done?: boolean }>;
  coverSrc?: string | null;
};

function HomeShelfRow({
  title,
  cards,
  variant,
  rail,
  t,
}: {
  title: string;
  cards: HomeShelfItem[];
  variant: "path" | "available" | "completed";
  rail?: boolean;
  t: Translate;
}) {
  if (cards.length === 0) return null;

  return (
    <section className="min-w-0 space-y-3.5">
      <p className={eyebrowClassName}>{title}</p>
      <div className={cn("grid gap-3", rail ? "grid-cols-2 lg:grid-cols-1" : "grid-cols-2")}>
        {cards.map((card) => {
          const meta =
            variant === "completed"
              ? t("father.home.trainingComplete")
              : variant === "available" && card.completed === 0
                ? t("father.home.trainingNotStarted")
                : t("father.home.sessionsComplete", {
                    completed: card.completed,
                    total: card.total,
                  });

          return (
            <Link
              key={card.training.id}
              href={trainingContinueHref(card)}
              className={cn(
                "min-w-0 overflow-hidden rounded-xl border border-border bg-card",
                interactiveSurfaceClassName
              )}
            >
              <div className="h-24 overflow-hidden bg-[#101510]">
                <CoverPhoto src={card.coverSrc} />
              </div>
              <div className="space-y-1.5 p-3.5">
                <p className="line-clamp-2 font-heading text-sm font-semibold leading-snug">
                  {homeTrainingLabel(card.training)}
                </p>
                <p className="text-xs text-muted-foreground">{meta}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function HomePathRow({
  path,
  trainings,
  completed,
  earned,
  t,
}: {
  path: HomeShelfItem[];
  trainings?: HomeShelfItem[];
  completed?: HomeShelfItem[];
  earned?: HomeEarnedMark[];
  t: Translate;
}) {
  const available = trainings ?? [];
  const finished = completed ?? [];
  const marks = earned ?? [];
  const open = path.length > 0 || available.length > 0;
  const done = finished.length > 0 || marks.length > 0;
  if (!open && !done) return null;

  const split = open && done;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border",
        split &&
          "grid divide-y divide-border lg:grid-cols-[minmax(0,1.4fr)_minmax(16.5rem,1fr)] lg:items-start lg:divide-x lg:divide-y-0"
      )}
    >
      {open ? (
        <div className="divide-y divide-border">
          {path.length > 0 ? (
            <div className="p-4 sm:p-5">
              <HomeShelfRow title={t("father.home.yourPath")} cards={path} variant="path" t={t} />
            </div>
          ) : null}
          {available.length > 0 ? (
            <div className="p-4 sm:p-5">
              <HomeShelfRow
                title={t("father.home.yourTrainings")}
                cards={available}
                variant="available"
                t={t}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {done ? (
        <div className="divide-y divide-border">
          {finished.length > 0 ? (
            <div className="p-4 sm:p-5">
              <HomeShelfRow
                title={t("father.home.completedTrainings")}
                cards={finished}
                variant="completed"
                rail={split}
                t={t}
              />
            </div>
          ) : null}
          {marks.length > 0 ? (
            <div className="p-4 sm:p-5">
              <HomeEarnedRow marks={marks} t={t} rail={split} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
