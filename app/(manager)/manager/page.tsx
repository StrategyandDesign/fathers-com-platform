import Link from "next/link";

import { CopyButton } from "@/components/manager/copy-button";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldClassName, initials, interactiveSurfaceClassName } from "@/lib/ui";
import { requireRole } from "@/lib/auth/session";
import { createGroup } from "@/lib/manager/actions";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { cn } from "@/lib/utils";

export default async function ManagerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const { groups, summary, needsAttention } = await loadManagerWorkspace(user.id);

  const stats = [
    { label: "Active Participants", value: summary.activeParticipants },
    { label: "Profiles Completed", value: summary.profilesCompleted },
    { label: "Sessions Completed", value: summary.sessionsCompleted },
    { label: "Trainings Completed", value: summary.trainingsCompleted },
    { label: "Pending Actions", value: summary.pendingActions },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your group’s progress. Fathers join with the invite code.
        </p>
      </div>
      <Flash error={params.error} notice={params.notice} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Group invite code</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fathers enter this code when they create an account.
          </p>
          {groups.length > 0 ? (
            <div className="mt-5 space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex flex-col gap-3 rounded-lg border border-input bg-black/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{group.name}</p>
                    <p className="break-all font-mono text-sm tracking-wide">{group.invite_code}</p>
                  </div>
                  <CopyButton value={group.invite_code} className="w-full sm:w-auto" />
                </div>
              ))}
            </div>
          ) : (
            <form action={createGroup} className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Group name</span>
                <input
                  className={fieldClassName}
                  name="name"
                  defaultValue="Pilot Group"
                  required
                  aria-invalid={Boolean(params.error) || undefined}
                />
              </label>
              <Button type="submit" className="w-full sm:w-auto">
                Create group
              </Button>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Needs attention</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Profile gaps, unfinished sessions, and certificates ready to send.
          </p>
          <div className="mt-5">
            {needsAttention.length === 0 ? (
              <EmptyState
                framed={false}
                className="p-0"
                title="You’re caught up"
              >
                No profile gaps, unfinished sessions, or certificates waiting to
                send.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {needsAttention.map((item) => (
                  <li key={`${item.fatherId}-${item.reason}`}>
                    <Link
                      href={`/manager/participants/${item.fatherId}`}
                      className={cn("flex items-center gap-3 px-3 py-3", interactiveSurfaceClassName)}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
                        {initials(item.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.name}</span>
                        <span className="block text-sm text-muted-foreground">
                          {item.reason}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            href="/manager/participants"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            View all participants
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Reports</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter by training, completion, and last activity. Download a CSV or PDF of
          your group.
        </p>
        <Link
          href="/manager/reports"
          className={cn(buttonVariants(), "mt-5 w-full sm:w-auto")}
        >
          Open reports
        </Link>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Assessments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create custom questions and assign them to fathers in your group.
        </p>
        <Link
          href="/manager/assessments"
          className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
        >
          View assessments
        </Link>
      </section>
    </div>
  );
}
