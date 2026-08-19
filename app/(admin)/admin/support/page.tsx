import Link from "next/link";

import { InboxTabs } from "@/components/admin/inbox-tabs";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/manager/types";
import { loadSupportInbox } from "@/lib/support/data";
import {
  messagePreview,
  parseSupportFilter,
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_ROLE_LABEL,
  SUPPORT_STATUS_LABEL,
  supportStatusClassName,
} from "@/lib/support/types";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  await requireRole("admin");
  const filter = parseSupportFilter(params.filter);
  const inbox = await loadSupportInbox(filter);

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin" className={interactiveLinkClassName}>
          Dashboard
        </Link>
        <span className="text-foreground/20">|</span>
        <span>Support Inbox</span>
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Support Inbox
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reports from fathers, managers, and reviewers.
          </p>
        </div>
        <InboxTabs active="reports" />
      </div>
      <div className="flex gap-2">
        <Link
          href="/admin/support"
          className={cn(
            buttonVariants({ variant: filter === "new" ? "default" : "outline" }),
            "flex-1 sm:flex-none"
          )}
        >
          New
        </Link>
        <Link
          href="/admin/support?filter=resolved"
          className={cn(
            buttonVariants({ variant: filter === "resolved" ? "default" : "outline" }),
            "flex-1 sm:flex-none"
          )}
        >
          Resolved
        </Link>
      </div>
      <Flash error={params.error || inbox.error || undefined} notice={params.notice} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {inbox.error ? (
          <EmptyState framed={false} title="Unable to load reports">
            Try again in a moment. Nothing here is shared with other users.
          </EmptyState>
        ) : inbox.rows.length === 0 ? (
          <EmptyState
            framed={false}
            title={filter === "resolved" ? "No resolved reports" : "No new reports"}
          >
            {filter === "resolved"
              ? "Resolved notes will appear here."
              : "When someone sends a report, it will show up here."}
          </EmptyState>
        ) : (
          <ul>
            <li className="hidden grid-cols-[6.5rem_6.5rem_minmax(0,1fr)_minmax(0,1.6fr)_8.5rem] gap-4 border-b border-border px-6 py-3 text-xs tracking-wide text-muted-foreground uppercase md:grid">
              <span>Date</span>
              <span>Role</span>
              <span>Category</span>
              <span>Message</span>
              <span>Status</span>
            </li>
            {inbox.rows.map((row) => (
              <li key={row.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/support/${row.id}`}
                  className={cn(
                    "grid gap-2 px-4 py-4 sm:px-6 md:grid-cols-[6.5rem_6.5rem_minmax(0,1fr)_minmax(0,1.6fr)_8.5rem] md:items-center",
                    interactiveSurfaceClassName
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Date</span>
                    <span className="tabular-nums">{formatShortDate(row.createdAt)}</span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Role</span>
                    <span>{SUPPORT_ROLE_LABEL[row.submitterRole]}</span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Category</span>
                    <span className="min-w-0 truncate text-right md:text-left">
                      {SUPPORT_CATEGORY_LABEL[row.category]}
                    </span>
                  </span>
                  <span className="min-w-0 text-sm text-muted-foreground">
                    <span className="md:hidden">Message · </span>
                    {messagePreview(row.message)}
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Status</span>
                    <span className={cn("font-medium", supportStatusClassName(row.status))}>
                      {SUPPORT_STATUS_LABEL[row.status]}
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
