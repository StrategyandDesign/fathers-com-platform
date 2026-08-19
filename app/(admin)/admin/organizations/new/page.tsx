import Link from "next/link";

import { createOrganization } from "@/lib/admin/actions";
import { loadAdminUsers } from "@/lib/admin/data";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { fieldClassName, interactiveLinkClassName } from "@/lib/ui";

export default async function AdminNewOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const managers = (await loadAdminUsers()).filter((user) => user.role === "manager");

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/organizations" className={interactiveLinkClassName}>
          Organizations
        </Link>
        <span className="text-foreground/20">|</span>
        <span>New</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          New organization
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign an existing manager. Promote someone on the Users page first if needed.
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <form action={createOrganization} className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Name</span>
          <input
            className={fieldClassName}
            name="name"
            required
            aria-invalid={Boolean(flash.error) || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Manager</span>
          {managers.length === 0 ? (
            <EmptyState
              framed={false}
              className="p-0"
              title="No managers yet"
              actionHref="/admin/users"
              actionLabel="Open users"
            >
              Change a user’s role to Manager, then come back to create the
              organization.
            </EmptyState>
          ) : (
            <select className={fieldClassName} name="manager_id" required>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name || manager.email || manager.id}
                </option>
              ))}
            </select>
          )}
        </label>
        {managers.length > 0 ? (
          <Button type="submit" className="w-full sm:w-auto">
            Create organization
          </Button>
        ) : null}
      </form>
    </div>
  );
}
