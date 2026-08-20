import Link from "next/link";

import { InboxTabs } from "@/components/admin/inbox-tabs";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { resendLeaderInvite } from "@/lib/admin/actions";
import { loadManagerInvites } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/session";
import { managerInviteStatus } from "@/lib/manager/invite";
import { formatShortDate } from "@/lib/manager/types";
import { interactiveLinkClassName } from "@/lib/ui";

const STATUS_LABEL = {
  pending: "Pending",
  accepted: "Joined",
  expired: "Expired",
} as const;

export default async function AdminLeaderInvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  await requireRole("admin");
  const invites = await loadManagerInvites();

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin" className={interactiveLinkClassName}>
          Dashboard
        </Link>
        <span className="text-white/20">|</span>
        <span>Leader invites</span>
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Leader invites
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join links sent to a leader’s inbox. Resend if the email did not land.
          </p>
        </div>
        <InboxTabs active="leaders" />
      </div>
      <Flash error={params.error} notice={params.notice} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {invites.length === 0 ? (
          <EmptyState
            framed={false}
            title="No leader invites yet"
            actionHref="/admin/organizations/new"
            actionLabel="Invite a leader"
          >
            Create an organization with a new email. The invite appears here and
            in their inbox.
          </EmptyState>
        ) : (
          <ul>
            {invites.map((invite) => {
              const status = managerInviteStatus(invite);
              return (
                <li
                  key={invite.id}
                  className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{invite.organizationName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[
                        invite.fullName,
                        invite.email,
                        STATUS_LABEL[status],
                        formatShortDate(invite.createdAt),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {status !== "accepted" ? (
                    <form action={resendLeaderInvite}>
                      <input type="hidden" name="invite_id" value={invite.id} />
                      <Button type="submit" variant="outline" className="w-full min-h-11 sm:w-auto">
                        Send again
                      </Button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
