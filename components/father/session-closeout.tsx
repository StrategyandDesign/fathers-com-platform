import Link from "next/link";

import { SkillUseCard } from "@/components/father/skill-use-card";
import { buttonVariants } from "@/components/ui/button";
import type { SessionCloseout } from "@/lib/father/session-closeout";
import type { SkillUse } from "@/lib/father/skill-use";
import type { Translate } from "@/lib/i18n/translate";
import { homePrimaryCtaClassName, interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function SessionCloseoutView({
  closeout,
  homeHref,
  sessionId,
  skill,
  skillUse,
  t,
}: {
  closeout: SessionCloseout;
  homeHref: string;
  sessionId?: string;
  skill?: string;
  skillUse?: SkillUse | null;
  t: Translate;
}) {
  const remainLabel = closeout.trainingComplete
    ? t("father.session.closeoutTrainingDone")
    : closeout.remaining === 1
      ? t("father.session.closeoutRemainOne")
      : t("father.session.closeoutRemainMany", { n: closeout.remaining });

  return (
    <section className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">{closeout.finished.title}</p>
        <h1 className="text-pretty text-[1.65rem] font-medium leading-[1.2] tracking-tight sm:text-[1.85rem]">
          {t("father.session.closeoutIn", { n: closeout.finished.session_number })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("father.session.sessionsCount", {
            completed: closeout.completed,
            total: closeout.total,
          })}
          <span aria-hidden> · </span>
          {remainLabel}
        </p>
      </header>

      {sessionId ? (
        <SkillUseCard
          sessionId={sessionId}
          skill={skill ?? ""}
          reported={skillUse ?? null}
          returnTo="done"
          showLater={false}
          t={t}
        />
      ) : null}

      <nav aria-label={t("father.session.closeoutMap")}>
        <ol className="flex flex-wrap gap-2">
          {closeout.marks.map((mark) => {
            const className = cn(
              "inline-flex size-11 items-center justify-center rounded-lg text-sm font-medium",
              interactiveControlClassName,
              mark.state === "current" && "bg-primary text-primary-foreground",
              mark.state === "done" && "bg-primary/20 text-foreground",
              mark.state === "next" && "border border-primary/60 text-foreground",
              mark.state === "locked" && "border border-border text-muted-foreground"
            );

            if (!mark.href) {
              return (
                <li key={mark.id}>
                  <span className={className} title={mark.title}>
                    {mark.number}
                  </span>
                </li>
              );
            }

            return (
              <li key={mark.id}>
                <Link href={mark.href} className={className} title={mark.title}>
                  <span className="sr-only">{mark.title}. </span>
                  {mark.number}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      {closeout.next ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("father.session.closeoutNext")}</p>
          <p className="text-lg font-medium leading-snug tracking-tight">{closeout.next.title}</p>
          {closeout.next.keyline ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{closeout.next.keyline}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        {closeout.nextHref ? (
          <Link
            href={closeout.nextHref}
            className={cn(buttonVariants({ variant: "default", size: "lg" }), homePrimaryCtaClassName)}
          >
            {t("father.session.closeoutContinue")}
          </Link>
        ) : (
          <Link
            href={homeHref}
            className={cn(buttonVariants({ variant: "default", size: "lg" }), homePrimaryCtaClassName)}
          >
            {t("father.session.closeoutHome")}
          </Link>
        )}
        {closeout.nextHref ? (
          <p>
            <Link
              href={homeHref}
              className={cn("text-sm text-muted-foreground underline underline-offset-4", interactiveControlClassName)}
            >
              {t("father.session.closeoutHome")}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
