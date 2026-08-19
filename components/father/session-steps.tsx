import Link from "next/link";
import { Check, Film, Lock, RotateCcw, SquareCheck } from "lucide-react";

import { getI18n } from "@/lib/i18n/server";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

type StepKey = "film" | "checkin" | "action";

export async function SessionSteps({
  sessionId,
  current,
  filmCompleted,
  checkinCompleted,
  actionCompleted,
}: {
  sessionId: string;
  current: StepKey;
  filmCompleted: boolean;
  checkinCompleted: boolean;
  actionCompleted: boolean;
}) {
  const { t } = await getI18n();
  const steps = [
    {
      key: "film" as const,
      short: t("father.session.film"),
      label: filmCompleted ? t("father.session.watched") : t("father.session.watchFilm"),
      href: `/father/sessions/${sessionId}`,
      done: filmCompleted,
      locked: false,
      icon: Film,
    },
    {
      key: "checkin" as const,
      short: t("father.session.checkin"),
      label: t("father.session.checkinLabel"),
      href: `/father/sessions/${sessionId}/checkin`,
      done: checkinCompleted,
      locked: !filmCompleted,
      icon: SquareCheck,
    },
    {
      key: "action" as const,
      short: t("father.session.action"),
      label: t("father.session.actionLabel"),
      href: `/father/sessions/${sessionId}/action`,
      done: actionCompleted,
      locked: !checkinCompleted,
      icon: RotateCcw,
    },
  ];

  return (
    <ol className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:gap-3">
      {steps.map((step) => {
        const isCurrent = step.key === current;
        const Icon = step.icon;
        const className = cn(
          "relative flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card px-1 py-3 text-center sm:min-h-24 sm:gap-1.5 sm:px-1.5 lg:min-h-[7.5rem] lg:gap-3 lg:px-4 lg:py-5",
          isCurrent && "border-border",
          step.locked && "opacity-55"
        );

        const inner = (
          <>
            {step.done ? (
              <span className="absolute top-1.5 end-1.5 flex size-5 items-center justify-center rounded-full bg-primary lg:top-3 lg:end-3 lg:size-6">
                <Check className="size-3 text-white lg:size-3.5" />
              </span>
            ) : step.locked ? (
              <Lock className="absolute top-1.5 end-1.5 size-3.5 text-muted-foreground lg:top-3 lg:end-3 lg:size-4" />
            ) : null}
            <Icon className="size-5 text-muted-foreground lg:size-6" strokeWidth={1.5} />
            <span className="text-[11px] font-medium leading-tight lg:hidden">
              {step.short}
              {step.done ? (
                <span className="mt-0.5 block font-normal text-muted-foreground">
                  {t("father.session.stepComplete")}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "hidden lg:block text-sm",
                step.done && "font-medium uppercase tracking-wide"
              )}
            >
              {step.label}
            </span>
          </>
        );

        return (
          <li key={step.key}>
            {step.locked ? (
              <div className={className}>{inner}</div>
            ) : (
              <Link
                href={step.href}
                className={cn(className, interactiveSurfaceClassName)}
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
