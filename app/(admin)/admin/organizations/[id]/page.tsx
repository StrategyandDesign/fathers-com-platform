import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteOrganization, updateOrganization } from "@/lib/admin/actions";
import { loadAdminOrganization } from "@/lib/admin/data";
import { CopyButton } from "@/components/manager/copy-button";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/manager/types";
import { fieldClassName, interactiveLinkClassName } from "@/lib/ui";

export default async function AdminOrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  await requireRole("admin");
  const detail = await loadAdminOrganization(id);

  if (!detail) notFound();

  const { group, participants, managers } = detail;
  const managerOptions = managers.some((manager) => manager.id === group.manager_id)
    ? managers
    : [
        {
          id: group.manager_id,
          full_name: group.managerName,
          email: group.managerEmail,
          role: "manager" as const,
          deactivated_at: null,
          created_at: "",
          organization: group.name,
        },
        ...managers,
      ];

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/organizations" className={interactiveLinkClassName}>
          Organizations
        </Link>
        <span className="text-white/20">|</span>
        <span className="min-w-0">{group.name}</span>
      </p>
      <Flash error={flash.error} notice={flash.notice} />

      <form action={updateOrganization} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="group_id" value={group.id} />
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {group.name}
        </h1>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Name</span>
          <input className={fieldClassName} name="name" defaultValue={group.name} required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Manager</span>
          <select
            className={fieldClassName}
            name="manager_id"
            defaultValue={group.manager_id}
            required
          >
            {managerOptions.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.full_name || manager.email || manager.id}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-3 rounded-lg border border-input bg-black/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Invite code</p>
            <p className="break-all font-mono text-sm tracking-wide">{group.invite_code}</p>
          </div>
          <CopyButton value={group.invite_code} className="w-full sm:w-auto" />
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          Save organization
        </Button>
      </form>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-semibold">Participants</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fathers who joined with this invite code.
          </p>
        </div>
        {participants.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground sm:px-6">
            No one has joined yet. Share this organization’s invite code with
            fathers.
          </p>
        ) : (
          <ul>
            {participants.map((participant) => (
              <li
                key={participant.fatherId}
                className="flex flex-col gap-1 border-b border-border px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{participant.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {participant.email ?? "No email on file"}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Joined {formatShortDate(participant.joinedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={deleteOrganization} className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="group_id" value={group.id} />
        <h2 className="font-heading text-lg font-semibold">Delete</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only empty organizations can be deleted. This does not delete users.
        </p>
        <Button
          type="submit"
          variant="destructive"
          className="mt-4 w-full sm:w-auto"
          disabled={participants.length > 0}
        >
          Delete organization
        </Button>
      </form>
    </div>
  );
}
