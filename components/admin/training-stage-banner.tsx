import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { StageStep } from "@/lib/admin/stage";
import { cn } from "@/lib/utils";

const STEP_LABEL: Record<StageStep, string> = {
  film: "Film",
  checkin: "Check-in",
  action: "Action",
};

export function TrainingStageBanner({
  trainingTitle,
  hubHref,
  editHref,
  current,
  sessionTitle,
}: {
  trainingTitle: string;
  hubHref: string;
  editHref: string;
  current?: StageStep;
  sessionTitle?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Sandbox preview
          </p>
          <p className="mt-1 font-medium">
            Nothing is saved. No session progress, no Action commitment, no assignment.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Walk Home → Film → Check-in → Action as a Father will see it after
            a Leader assigns this training. Return to editing with no side effects.
          </p>
          {current && sessionTitle ? (
            <p className="mt-2 text-sm text-foreground">
              {trainingTitle}
              <span className="text-foreground/20"> · </span>
              {sessionTitle}
              <span className="text-foreground/20"> · </span>
              {STEP_LABEL[current]}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link
            href={hubHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Snapshot
          </Link>
          <Link
            href={editHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Edit training
          </Link>
        </div>
      </div>
    </div>
  );
}
