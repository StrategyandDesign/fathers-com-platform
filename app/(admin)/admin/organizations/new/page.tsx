import Link from "next/link";

import { provisionOrganization } from "@/lib/admin/actions";
import { loadAdminUsers } from "@/lib/admin/data";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
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
        <span className="text-white/20">|</span>
        <span>New</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          New organization
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a leader email to send a join link to their inbox. Or choose a
          leader who already has an account.
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <form action={provisionOrganization} className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Organization name</span>
          <input
            className={fieldClassName}
            name="name"
            required
            aria-invalid={Boolean(flash.error) || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Leader email</span>
          <input
            className={fieldClassName}
            type="email"
            name="email"
            autoComplete="off"
            aria-invalid={Boolean(flash.error) || undefined}
          />
          <span className="block text-xs text-muted-foreground">
            A new email gets a join link. An existing Leader gets the group on
            their desk.
          </span>
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Leader name</span>
          <input className={fieldClassName} name="full_name" maxLength={80} />
        </label>
        {managers.length > 0 ? (
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Or choose an existing Leader</span>
            <select className={fieldClassName} name="manager_id" defaultValue="">
              <option value="">Invite by email above</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name || manager.email || manager.id}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button type="submit" className="w-full sm:w-auto">
          Send invite
        </Button>
      </form>
    </div>
  );
}
