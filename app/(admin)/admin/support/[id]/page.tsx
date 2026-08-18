import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { SupportStatusForms } from "@/components/support/status-forms";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAdminUser } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/session";
import { loadSupportReport } from "@/lib/support/data";
import {
  formatSupportDateTime,
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_ROLE_LABEL,
  SUPPORT_STATUS_LABEL,
  supportStatusClassName,
} from "@/lib/support/types";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const REPORT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminSupportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  await requireRole("admin");

  if (!REPORT_ID.test(id)) {
    return (
      <div className="space-y-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link href="/admin/support" className={interactiveLinkClassName}>
            Support Inbox
          </Link>
          <span className="text-white/20">|</span>
          <span>Report</span>
        </p>
        <EmptyState title="That report was not found" actionHref="/admin/support" actionLabel="Back to inbox">
          It may have been removed, or the link is no longer valid.
        </EmptyState>
      </div>
    );
  }

  const detail = await loadSupportReport(id);
  let submitter = null;
  if (detail.report && !detail.error) {
    try {
      submitter = await loadAdminUser(detail.report.submitterId);
    } catch {
      submitter = null;
    }
  }

  if (detail.error) {
    return (
      <div className="space-y-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link href="/admin/support" className={interactiveLinkClassName}>
            Support Inbox
          </Link>
          <span className="text-white/20">|</span>
          <span>Report</span>
        </p>
        <EmptyState title="Unable to load this report" actionHref="/admin/support" actionLabel="Back to inbox">
          Try again in a moment.
        </EmptyState>
      </div>
    );
  }

  if (!detail.report) {
    return (
      <div className="space-y-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link href="/admin/support" className={interactiveLinkClassName}>
            Support Inbox
          </Link>
          <span className="text-white/20">|</span>
          <span>Report</span>
        </p>
        <EmptyState title="That report was not found" actionHref="/admin/support" actionLabel="Back to inbox">
          It may have been removed, or the link is no longer valid.
        </EmptyState>
      </div>
    );
  }

  const { report } = detail;
  const who = [detail.submitterName || submitter?.full_name, submitter?.email]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/support" className={interactiveLinkClassName}>
          Support Inbox
        </Link>
        <span className="text-white/20">|</span>
        <span>{SUPPORT_CATEGORY_LABEL[report.category]}</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {SUPPORT_CATEGORY_LABEL[report.category]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatSupportDateTime(report.createdAt)} · {SUPPORT_ROLE_LABEL[report.submitterRole]}
          {who ? ` · ${who}` : null}
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">Status</h2>
          <p className={cn("text-sm font-medium", supportStatusClassName(report.status))}>
            {SUPPORT_STATUS_LABEL[report.status]}
          </p>
        </div>
        {report.resolvedAt ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Resolved {formatSupportDateTime(report.resolvedAt)}
          </p>
        ) : null}
        <div className="mt-5">
          <SupportStatusForms reportId={report.id} status={report.status} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Message</h2>
        {report.page ? (
          <p className="mt-2 text-sm text-muted-foreground">Page or feature · {report.page}</p>
        ) : null}
        <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed">{report.message}</p>
      </section>

      {detail.screenshotUrl ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Screenshot</h2>
          <a
            href={detail.screenshotUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block overflow-hidden rounded-lg border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.screenshotUrl}
              alt="Submitted screenshot"
              className="max-h-[32rem] w-full object-contain bg-black/40"
            />
          </a>
        </section>
      ) : null}
    </div>
  );
}
