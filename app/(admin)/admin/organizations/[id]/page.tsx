import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteOrganization, updateOrganization } from "@/lib/admin/actions";
import {
  addOrganizationStaff,
  inviteOrganizationLeader,
  removeOrganizationStaff,
} from "@/lib/org-staff/actions";
import { canRemoveStaff } from "@/lib/org-staff/types";
import { loadAdminOrganization } from "@/lib/admin/data";
import { CopyButton } from "@/components/manager/copy-button";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

  const { group, participants, managers, reviewers, staff } = detail;
  const managerCount = staff.filter((row) => row.staffRole === "manager").length;
  const availableLeaders = managers.filter(
    (manager) => !staff.some((row) => row.profileId === manager.id && row.staffRole === "manager")
  );
  const availableReviewers = reviewers.filter(
    (reviewer) => !staff.some((row) => row.profileId === reviewer.id && row.staffRole === "reviewer")
  );
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
          <input
            className={fieldClassName}
            name="name"
            defaultValue={group.name}
            required
            aria-invalid={Boolean(flash.error) || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Listed owner</span>
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

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Leaders and reviewers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          More than one leader can share this organization. They see the same roster, and each
          action is recorded for the others. Reviewers on this list are scoped to this group.
        </p>
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {staff.map((row) => (
            <li
              key={`${row.profileId}-${row.staffRole}`}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{row.name}</p>
                <p className="text-sm text-muted-foreground">
                  {row.staffRole === "manager" ? "Leader" : "Reviewer"}
                  {row.listedOwner ? " · listed owner" : ""}
                </p>
              </div>
              <form action={removeOrganizationStaff}>
                <input type="hidden" name="group_id" value={group.id} />
                <input type="hidden" name="profile_id" value={row.profileId} />
                <input type="hidden" name="return_to" value={`/admin/organizations/${group.id}`} />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={
                    !canRemoveStaff({
                      targetId: row.profileId,
                      targetRole: row.staffRole,
                      managerCount,
                    })
                  }
                >
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>

        {availableLeaders.length > 0 ? (
          <form action={addOrganizationStaff} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="group_id" value={group.id} />
            <input type="hidden" name="staff_role" value="manager" />
            <input type="hidden" name="return_to" value={`/admin/organizations/${group.id}`} />
            <label className="block min-w-0 flex-1 space-y-2">
              <span className="text-sm text-muted-foreground">Add an existing leader</span>
              <select className={fieldClassName} name="profile_id" required>
                {availableLeaders.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name || manager.email || manager.id}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              Add leader
            </Button>
          </form>
        ) : null}

        {availableReviewers.length > 0 ? (
          <form action={addOrganizationStaff} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="group_id" value={group.id} />
            <input type="hidden" name="staff_role" value="reviewer" />
            <input type="hidden" name="return_to" value={`/admin/organizations/${group.id}`} />
            <label className="block min-w-0 flex-1 space-y-2">
              <span className="text-sm text-muted-foreground">Add a reviewer</span>
              <select className={fieldClassName} name="profile_id" required>
                {availableReviewers.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.full_name || reviewer.email || reviewer.id}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              Add reviewer
            </Button>
          </form>
        ) : null}

        <form action={inviteOrganizationLeader} className="mt-4 space-y-3">
          <input type="hidden" name="group_id" value={group.id} />
          <p className="text-sm text-muted-foreground">Invite a new leader to this organization</p>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Email</span>
            <input className={fieldClassName} name="email" type="email" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Name</span>
            <input className={fieldClassName} name="full_name" maxLength={80} />
          </label>
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            Send invite
          </Button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-semibold">Participants</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fathers who joined with this invite code.
          </p>
        </div>
        {participants.length === 0 ? (
          <EmptyState framed={false} title="No one has joined yet">
            Share this organization’s invite code with fathers. They create an
            account and land in this group.
          </EmptyState>
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
