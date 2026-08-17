import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import type { Session, Training } from "@/lib/father/types";
import { interactiveIconClassName, interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const STEP_LABEL = {
  film: "Film",
  checkin: "Check-in",
  action: "Action",
} as const;

export function SessionHeader({
  training,
  session,
  current,
  completedCount,
  sessionTotal,
  backHref,
}: {
  training: Training;
  session: Session;
  current: "film" | "checkin" | "action";
  completedCount?: number;
  sessionTotal?: number;
  backHref: string;
}) {
  const detail = session.keyline ?? session.title;
  const total = sessionTotal ?? training.session_count;

  return (
    <div className="flex items-start gap-1">
      <Link
        href={backHref}
        aria-label="Back"
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground lg:hidden",
          interactiveIconClassName
        )}
      >
        <ChevronLeft className="size-6" />
      </Link>
      <div className="min-w-0 flex-1 pt-2 lg:pt-0">
        <div className="lg:hidden">
          <p className="truncate text-xs text-muted-foreground">{training.title}</p>
          <p className="mt-0.5 text-sm font-medium leading-snug">
            Session {session.session_number}
            {detail ? ` · ${detail}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{STEP_LABEL[current]}</p>
        </div>
        <p className="hidden text-center text-sm text-muted-foreground lg:block">
          <Link href="/father/trainings" className={interactiveLinkClassName}>
            {training.title}
          </Link>
          <span className="px-2 text-white/20">|</span>
          <span>
            Session {session.session_number}
            {detail ? ` · ${detail}` : ""}
          </span>
          <span className="px-2 text-white/20">|</span>
          <span className="text-foreground">{STEP_LABEL[current]}</span>
          {typeof completedCount === "number" ? (
            <>
              <span className="px-2 text-white/20">|</span>
              <span>
                {completedCount}/{total} Sessions
              </span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function SessionCrumbNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-sm text-muted-foreground", className)}>
      Film → Check-in → Action = Session Complete
    </p>
  );
}
