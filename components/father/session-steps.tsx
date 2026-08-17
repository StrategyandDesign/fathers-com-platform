import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
      label: "Film",
      href: `/father/sessions/${sessionId}`,
      done: filmCompleted,
      locked: false,
    },
    {
      key: "checkin" as const,
      label: "Check-in",
      href: `/father/sessions/${sessionId}/checkin`,
      done: checkinCompleted,
      locked: !filmCompleted,
    },
    {
      key: "action" as const,
      label: "Action",
      href: `/father/sessions/${sessionId}/action`,
      done: actionCompleted,
      locked: !checkinCompleted,
    },
  ];

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const isCurrent = step.key === current;
        const className = cn(
          "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm",
          isCurrent
            ? "border-foreground/20 bg-muted"
            : "border-transparent text-muted-foreground",
          step.locked && "pointer-events-none opacity-50"
        );

        const inner = (
          <>
            <span className="tabular-nums text-xs text-muted-foreground">
              {index + 1}
            </span>
            <span>{step.label}</span>
            {step.done ? <Badge variant="secondary">Done</Badge> : null}
          </>
        );

        return (
          <li key={step.key}>
            {step.locked ? (
              <span className={className}>{inner}</span>
            ) : (
              <Link href={step.href} className={className}>
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
