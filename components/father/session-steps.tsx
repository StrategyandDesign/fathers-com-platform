import Link from "next/link";
import { Check, Film, Lock, RotateCcw, SquareCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type StepKey = "film" | "checkin" | "action";

export function SessionSteps({
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
  const steps = [
    {
      key: "film" as const,
      short: "Film",
      label: filmCompleted ? "Watched" : "Watch the film",
      href: `/father/sessions/${sessionId}`,
      done: filmCompleted,
      locked: false,
      icon: Film,
    },
    {
      key: "checkin" as const,
      short: "Check-in",
      label: "Answer three practical questions",
      href: `/father/sessions/${sessionId}/checkin`,
      done: checkinCompleted,
      locked: !filmCompleted,
      icon: SquareCheck,
    },
    {
      key: "action" as const,
      short: "Action",
      label: "Log your weekly action",
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
          isCurrent && "border-white/20",
          step.locked && "opacity-55"
        );

        const inner = (
          <>
            {step.done ? (
              <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary lg:top-3 lg:right-3 lg:size-6">
                <Check className="size-3 text-white lg:size-3.5" />
              </span>
            ) : step.locked ? (
              <Lock className="absolute top-1.5 right-1.5 size-3.5 text-muted-foreground lg:top-3 lg:right-3 lg:size-4" />
            ) : null}
            <Icon className="size-5 text-muted-foreground lg:size-6" strokeWidth={1.5} />
            <span className="text-[11px] font-medium leading-tight lg:hidden">
              {step.short}
              {step.done ? (
                <span className="mt-0.5 block font-normal text-muted-foreground">(Complete)</span>
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
                className={cn(
                  className,
                  "outline-none transition-colors duration-150 ease-out hover:bg-white/5 focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-90"
                )}
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
