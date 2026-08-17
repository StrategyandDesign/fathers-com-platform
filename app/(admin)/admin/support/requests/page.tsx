import Link from "next/link";

import { InboxTabs } from "@/components/admin/inbox-tabs";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/manager/types";
import { loadTrainingRequestInbox } from "@/lib/training-requests/data";
import {
  parseTrainingRequestFilter,
  requestPreview,
  TRAINING_REQUEST_STATUS_LABEL,
  trainingRequestStatusClassName,
} from "@/lib/training-requests/types";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function whoLabel(managerName: string | undefined, organizationName: string | null) {
  if (managerName && organizationName) return `${managerName} · ${organizationName}`;
  return managerName || organizationName || "Manager";
}

export default async function AdminTrainingRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  await requireRole("admin");
  const filter = parseTrainingRequestFilter(params.filter);
  const inbox = await loadTrainingRequestInbox(filter);

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin" className={interactiveLinkClassName}>
          Dashboard
        </Link>
        <span className="text-white/20">|</span>
        <span>Training Requests</span>
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Training Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Topics managers would like sourced for their organizations.
          </p>
        </div>
        <InboxTabs active="requests" />
      </div>
      <div className="flex gap-2">
        <Link
          href="/admin/support/requests"
          className={cn(
            buttonVariants({ variant: filter === "new" ? "default" : "outline" }),
            "flex-1 sm:flex-none"
          )}
        >
          New
        </Link>
        <Link
          href="/admin/support/requests?filter=closed"
          className={cn(
            buttonVariants({ variant: filter === "closed" ? "default" : "outline" }),
            "flex-1 sm:flex-none"
          )}
        >
          Closed
        </Link>
      </div>
      <Flash error={params.error || inbox.error || undefined} notice={params.notice} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {inbox.error ? (
          <EmptyState framed={false} title="Unable to load training requests">
            Try again in a moment. These are separate from problem reports.
          </EmptyState>
        ) : inbox.rows.length === 0 ? (
          <EmptyState
            framed={false}
            title={filter === "closed" ? "No closed requests" : "No new requests"}
          >
            {filter === "closed"
              ? "Planned and declined requests will appear here."
              : "When a manager requests a training, it will show up here."}
          </EmptyState>
        ) : (
          <ul>
            <li className="hidden grid-cols-[6.5rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_9rem] gap-4 border-b border-border px-6 py-3 text-xs tracking-wide text-muted-foreground uppercase md:grid">
              <span>Date</span>
              <span>Manager / organization</span>
              <span>Topic</span>
              <span>Description</span>
              <span>Status</span>
            </li>
            {inbox.rows.map((row) => (
              <li key={row.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/support/requests/${row.id}`}
                  className={cn(
                    "grid gap-2 px-4 py-4 sm:px-6 md:grid-cols-[6.5rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_9rem] md:items-center",
                    interactiveSurfaceClassName
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Date</span>
                    <span className="tabular-nums">{formatShortDate(row.createdAt)}</span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Manager</span>
                    <span className="min-w-0 truncate text-right md:text-left">
                      {whoLabel(inbox.names[row.managerId], row.organizationName)}
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Topic</span>
                    <span className="min-w-0 truncate text-right font-medium md:text-left">
                      {row.topic}
                    </span>
                  </span>
                  <span className="min-w-0 text-sm text-muted-foreground">
                    <span className="md:hidden">Description · </span>
                    {requestPreview(row.description)}
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-sm md:block">
                    <span className="text-muted-foreground md:hidden">Status</span>
                    <span className={cn("font-medium", trainingRequestStatusClassName(row.status))}>
                      {TRAINING_REQUEST_STATUS_LABEL[row.status]}
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
