import Link from "next/link";

import { CoverPhoto } from "@/components/brand/cover";
import type { Translate } from "@/lib/i18n/translate";
import { continueHref, type Session, type SessionProgress, type Training } from "@/lib/father/types";
import { gatedPartLabel } from "@/lib/trainings/series";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export function HomePathRow({
  cards,
  t,
}: {
  cards: Array<{
    training: Training;
    completed: number;
    total: number;
    gated: boolean;
    next?: Session;
    nextProgress: SessionProgress | null;
    coverSrc?: string | null;
  }>;
  t: Translate;
}) {
  if (cards.length === 0) return null;

  return (
    <section className="min-w-0 space-y-3">
      <p className={eyebrowClassName}>{t("father.home.yourPath")}</p>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card) => {
          const inner = (
            <>
              <div className="h-20 overflow-hidden bg-[#101510]">
                <CoverPhoto src={card.coverSrc} />
              </div>
              <div className="space-y-1.5 p-3">
                <p className="line-clamp-2 font-heading text-sm font-semibold leading-snug">
                  {card.training.title}
                </p>
                {card.gated ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("father.trainings.gatedPart", { n: gatedPartLabel(card.training) })}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("father.home.sessionsComplete", {
                      completed: card.completed,
                      total: card.total,
                    })}
                  </p>
                )}
              </div>
            </>
          );

          if (card.gated) {
            return (
              <div
                key={card.training.id}
                className="w-[9.75rem] shrink-0 overflow-hidden rounded-xl border border-border bg-card opacity-50"
              >
                {inner}
              </div>
            );
          }

          return (
            <Link
              key={card.training.id}
              href={
                card.next ? continueHref(card.next.id, card.nextProgress) : "/father/trainings"
              }
              className={cn(
                "w-[9.75rem] shrink-0 overflow-hidden rounded-xl border border-border bg-card",
                interactiveSurfaceClassName
              )}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
