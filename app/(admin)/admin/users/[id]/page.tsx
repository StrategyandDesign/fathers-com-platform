import Link from "next/link";
import { notFound } from "next/navigation";

import { changeUserRole, setUserDeactivated } from "@/lib/admin/actions";
import { loadAdminUser } from "@/lib/admin/data";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { APP_ROLES, ROLE_LABEL } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/manager/types";
import { fieldClassName, interactiveLinkClassName } from "@/lib/ui";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const { user: actor } = await requireRole("admin");
  const user = await loadAdminUser(id);

  if (!user) notFound();

  const isSelf = user.id === actor.id;

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/users" className={interactiveLinkClassName}>
          Users
        </Link>
        <span className="text-foreground/20">|</span>
        <span className="min-w-0">{user.full_name || user.email || user.id.slice(0, 8)}</span>
      </p>
      <Flash error={flash.error} notice={flash.notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {user.full_name || user.email || "User"}
        </h1>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="min-w-0 text-right">{user.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Organization</dt>
            <dd className="min-w-0 text-right">{user.organization ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Joined</dt>
            <dd>{formatShortDate(user.created_at)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Status</dt>
            <dd>{user.deactivated_at ? "Deactivated" : "Active"}</dd>
          </div>
        </dl>
      </section>

      <form action={changeUserRole} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="user_id" value={user.id} />
        <h2 className="font-heading text-lg font-semibold">Role</h2>
        <p className="text-sm text-muted-foreground">
          Updates both the profile and Auth app_metadata. They must sign in again.
          The last super-admin cannot be demoted. Reassign organizations before
          demoting a manager.
        </p>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Role</span>
          <select
            className={fieldClassName}
            name="role"
            defaultValue={user.role}
            required
            aria-invalid={Boolean(flash.error) || undefined}
          >
            {APP_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="w-full sm:w-auto">
          Save role
        </Button>
      </form>

      <form action={setUserDeactivated} className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="user_id" value={user.id} />
        <input type="hidden" name="deactivated" value={user.deactivated_at ? "false" : "true"} />
        <h2 className="font-heading text-lg font-semibold">
          {user.deactivated_at ? "Reactivate" : "Deactivate"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSelf
            ? "You cannot deactivate your own account."
            : user.deactivated_at
              ? "They will be able to sign in again."
              : "They cannot sign in. This is not a delete."}
        </p>
        <Button
          type="submit"
          variant={user.deactivated_at ? "outline" : "destructive"}
          className="mt-4 w-full sm:w-auto"
          disabled={isSelf && !user.deactivated_at}
        >
          {user.deactivated_at ? "Reactivate account" : "Deactivate account"}
        </Button>
      </form>
    </div>
  );
}
