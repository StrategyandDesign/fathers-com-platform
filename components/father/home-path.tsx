import Link from "next/link";

import { CoverPhoto } from "@/components/brand/cover";
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
  t,
}: {
  title: string;
  cards: HomeShelfItem[];
  variant: "path" | "available" | "completed";
  t: Translate;
}) {
  if (cards.length === 0) return null;

  return (
    <section className="min-w-0 space-y-3">
      <p className={eyebrowClassName}>{title}</p>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                "w-[9.75rem] shrink-0 overflow-hidden rounded-xl border border-border bg-card",
                interactiveSurfaceClassName
              )}
            >
              <div className="h-20 overflow-hidden bg-[#101510]">
                <CoverPhoto src={card.coverSrc} />
              </div>
              <div className="space-y-1.5 p-3">
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
  t,
}: {
  path: HomeShelfItem[];
  trainings?: HomeShelfItem[];
  completed?: HomeShelfItem[];
  t: Translate;
}) {
  const available = trainings ?? [];
  const finished = completed ?? [];
  if (path.length === 0 && available.length === 0 && finished.length === 0) return null;

  const both = path.length > 0 && available.length > 0;

  return (
    <div className="space-y-5">
      <div className={cn(both && "grid items-start gap-5 lg:grid-cols-2")}>
        <HomeShelfRow title={t("father.home.yourPath")} cards={path} variant="path" t={t} />
        <HomeShelfRow
          title={t("father.home.yourTrainings")}
          cards={available}
          variant="available"
          t={t}
        />
      </div>
      <HomeShelfRow
        title={t("father.home.completedTrainings")}
        cards={finished}
        variant="completed"
        t={t}
      />
    </div>
  );
}
