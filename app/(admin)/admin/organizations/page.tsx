import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAdminOrganizations, loadManagerInvites } from "@/lib/admin/data";
import { isManagerInviteOpen } from "@/lib/manager/invite";
import { requireRole } from "@/lib/auth/session";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const [organizations, invites] = await Promise.all([
    loadAdminOrganizations(),
    loadManagerInvites(),
  ]);
  const pendingInvites = invites.filter((invite) => isManagerInviteOpen(invite));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Organizations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Groups with a manager and invite code. Managers still only see their own.
          </p>
        </div>
        <Link href="/admin/organizations/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
          New organization
        </Link>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      {pendingInvites.length > 0 ? (
        <section className="rounded-xl border border-border bg-card px-4 py-5 sm:px-6">
          <p className="font-heading font-semibold">Waiting on a leader</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {pendingInvites.map((invite) => (
              <li key={invite.id}>
                {invite.organizationName} · {invite.email}
              </li>
            ))}
          </ul>
          <Link
            href="/admin/support/leaders"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full sm:w-auto")}
          >
            Open invites
          </Link>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {organizations.length === 0 ? (
          <EmptyState
            framed={false}
            title="No organizations yet"
            actionHref="/admin/organizations/new"
            actionLabel="New organization"
          >
            Create one and assign a manager. Fathers join with that group’s
            invite code.
          </EmptyState>
        ) : (
          <ul>
            <li className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,8rem)_8rem] gap-4 border-b border-border px-6 py-3 text-xs tracking-wide text-muted-foreground uppercase md:grid">
              <span>Name</span>
              <span>Manager</span>
              <span>Invite</span>
              <span>Participants</span>
            </li>
            {organizations.map((org) => (
              <li key={org.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/organizations/${org.id}`}
                  className={cn(
                    "grid gap-2 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,8rem)_8rem] md:items-center",
                    interactiveSurfaceClassName
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{org.name}</span>
                    <span className="block truncate font-mono text-sm text-muted-foreground md:hidden">
                      {org.invite_code}
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Manager</span>
                    <span className="min-w-0 truncate text-right md:text-left">
                      {org.managerName}
                    </span>
                  </span>
                  <span className="hidden font-mono text-sm text-muted-foreground md:block">
                    {org.invite_code}
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Participants</span>
                    <span className="text-right tabular-nums md:text-left">
                      {org.participantCount}
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
