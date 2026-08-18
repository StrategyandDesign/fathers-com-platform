import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAdminUsers } from "@/lib/admin/data";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const users = await loadAdminUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Change roles and deactivate accounts. The last super-admin cannot be removed.
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {users.length === 0 ? (
          <EmptyState
            framed={false}
            title="No users yet"
            actionHref="/admin/organizations"
            actionLabel="Open organizations"
          >
            Accounts appear here after someone signs up with an invite code.
            Create an organization first so a manager can share that code.
          </EmptyState>
        ) : (
          <ul>
            <li className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_7rem] gap-4 border-b border-border px-6 py-3 text-xs tracking-wide text-muted-foreground uppercase md:grid">
              <span>Name</span>
              <span>Organization</span>
              <span>Role</span>
              <span>Status</span>
            </li>
            {users.map((user) => (
              <li key={user.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/users/${user.id}`}
                  className={cn(
                    "grid gap-2 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_7rem] md:items-center",
                    interactiveSurfaceClassName
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {user.full_name || user.email || user.id.slice(0, 8)}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {user.email ?? "No email"}
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Organization</span>
                    <span className="min-w-0 truncate text-right md:text-left">
                      {user.organization ?? "—"}
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Role</span>
                    <span>{ROLE_LABEL[user.role]}</span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Status</span>
                    <span className={user.deactivated_at ? "text-destructive" : "text-muted-foreground"}>
                      {user.deactivated_at ? "Deactivated" : "Active"}
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
