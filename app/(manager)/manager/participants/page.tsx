import Link from "next/link";

import { UserAvatar } from "@/components/layout/user-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { formatShortDate } from "@/lib/manager/types";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const PROFILE_LABEL = {
  completed: "Profile complete",
  in_progress: "In progress",
  not_started: "Needs attention",
} as const;

export default async function ManagerParticipantsPage() {
  const { user } = await requireRole("manager");
  const { participants } = await loadManagerWorkspace(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Participants
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fathers in your group. Open anyone to assign a training or send a
          certificate.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {participants.length === 0 ? (
          <EmptyState
            framed={false}
            title="No one has joined yet"
            actionHref="/manager"
            actionLabel="Open dashboard"
          >
            Share your invite code from the Dashboard so fathers can create an
            account.
          </EmptyState>
        ) : (
          <ul>
            <li className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_8rem] gap-4 border-b border-border px-6 py-3 text-xs tracking-wide text-muted-foreground uppercase md:grid">
              <span>Name</span>
              <span>Profile Status</span>
              <span>Current Training</span>
              <span>Last Activity</span>
            </li>
            {participants.map((participant) => (
              <li key={participant.fatherId} className="border-b border-border last:border-0">
                <Link
                  href={`/manager/participants/${participant.fatherId}`}
                  className={cn(
                    "grid gap-2 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_8rem] md:items-center",
                    interactiveSurfaceClassName
                  )}
                >
                  <span className="flex items-center gap-3">
                    <UserAvatar
                      name={participant.name}
                      src={participant.avatarUrl}
                      className="size-10 shrink-0 text-xs font-medium md:size-9"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{participant.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {participant.groupName}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 pl-[3.25rem] text-sm md:block md:pl-0">
                    <span className="text-muted-foreground md:hidden">Profile</span>
                    <span className="text-right text-muted-foreground md:text-left">
                      {PROFILE_LABEL[participant.profileStatus]}
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 pl-[3.25rem] text-sm md:block md:pl-0">
                    <span className="text-muted-foreground md:hidden">Training</span>
                    <span className="text-right md:text-left">{participant.progressLabel}</span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 pl-[3.25rem] text-sm md:block md:pl-0">
                    <span className="text-muted-foreground md:hidden">Last active</span>
                    <span className="text-right text-muted-foreground md:text-left">
                      {formatShortDate(participant.lastActivity)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
