import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { TrainingRequestStatusForms } from "@/components/training-requests/status-forms";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAdminUser } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/session";
import { loadTrainingRequest } from "@/lib/training-requests/data";
import {
  formatRequestDateTime,
  TRAINING_REQUEST_STATUS_LABEL,
  trainingRequestStatusClassName,
} from "@/lib/training-requests/types";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminTrainingRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  await requireRole("admin");

  if (!REQUEST_ID.test(id)) {
    return (
      <div className="space-y-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link href="/admin/support/requests" className={interactiveLinkClassName}>
            Training Requests
          </Link>
          <span className="text-white/20">|</span>
          <span>Request</span>
        </p>
        <EmptyState
          title="That request was not found"
          actionHref="/admin/support/requests"
          actionLabel="Back to requests"
        >
          It may have been removed, or the link is no longer valid.
        </EmptyState>
      </div>
    );
  }

  const detail = await loadTrainingRequest(id);
  let manager = null;
  if (detail.request && !detail.error) {
    try {
      manager = await loadAdminUser(detail.request.managerId);
    } catch {
      manager = null;
    }
  }

  if (detail.error) {
    return (
      <div className="space-y-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link href="/admin/support/requests" className={interactiveLinkClassName}>
            Training Requests
          </Link>
          <span className="text-white/20">|</span>
          <span>Request</span>
        </p>
        <EmptyState
          title="Unable to load this request"
          actionHref="/admin/support/requests"
          actionLabel="Back to requests"
        >
          Try again in a moment.
        </EmptyState>
      </div>
    );
  }

  if (!detail.request) {
    return (
      <div className="space-y-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link href="/admin/support/requests" className={interactiveLinkClassName}>
            Training Requests
          </Link>
          <span className="text-white/20">|</span>
          <span>Request</span>
        </p>
        <EmptyState
          title="That request was not found"
          actionHref="/admin/support/requests"
          actionLabel="Back to requests"
        >
          It may have been removed, or the link is no longer valid.
        </EmptyState>
      </div>
    );
  }

  const { request } = detail;
  const who = [detail.managerName || manager?.full_name, manager?.email]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/support/requests" className={interactiveLinkClassName}>
          Training Requests
        </Link>
        <span className="text-white/20">|</span>
        <span>{request.topic}</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {request.topic}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatRequestDateTime(request.createdAt)}
          {who ? ` · ${who}` : " · Manager"}
          {request.organizationName ? ` · ${request.organizationName}` : null}
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">Status</h2>
          <p className={cn("text-sm font-medium", trainingRequestStatusClassName(request.status))}>
            {TRAINING_REQUEST_STATUS_LABEL[request.status]}
          </p>
        </div>
        {request.decidedAt ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Updated {formatRequestDateTime(request.decidedAt)}
          </p>
        ) : null}
        <div className="mt-5">
          <TrainingRequestStatusForms requestId={request.id} status={request.status} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Why it’s needed</h2>
        {request.audience ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Audience or urgency · {request.audience}
          </p>
        ) : null}
        <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed">
          {request.description}
        </p>
      </section>
    </div>
  );
}
