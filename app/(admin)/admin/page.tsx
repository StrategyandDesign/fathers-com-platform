import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { loadAdminDashboard } from "@/lib/admin/data";
import { gatheringHomePreview, loadAdminGathering } from "@/lib/admin/gathering";
import { requireRole } from "@/lib/auth/session";
import { loadOpenSupportCount } from "@/lib/support/data";
import { loadOpenTrainingRequestCount } from "@/lib/training-requests/data";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  await requireRole("admin");
  const [summary, openSupportCount, openRequestCount, gathering] = await Promise.all([
    loadAdminDashboard(),
    loadOpenSupportCount(),
    loadOpenTrainingRequestCount(),
    loadAdminGathering(),
  ]);
  const gatheringPreview = gathering.unavailable ? null : gatheringHomePreview(gathering);

  const stats = [
    { label: "Organizations", value: summary.organizationCount, href: "/admin/organizations" },
    { label: "Users", value: summary.userCount, href: "/admin/users" },
    { label: "Trainings", value: summary.trainingCount, href: "/admin/trainings" },
    { label: "Unpublished", value: summary.unpublishedCount, href: "/admin/trainings" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide organizations, catalog, and users.
        </p>
      </div>
      <Flash error={params.error} notice={params.notice} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(
              "rounded-xl border border-border bg-card p-4 sm:p-5",
              interactiveSurfaceClassName
            )}
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{stat.value}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Organizations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a group with a manager and invite code.
          </p>
          <Link
            href="/admin/organizations/new"
            className={cn(buttonVariants(), "mt-5 w-full sm:w-auto")}
          >
            New organization
          </Link>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Catalog</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create trainings and assessments here, then share them with
            organization Leaders. Leaders decide what reaches their fathers.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/admin/trainings/new"
              className={cn(buttonVariants({ variant: "outline" }), "w-full max-w-full sm:w-auto")}
            >
              New training
            </Link>
            <Link
              href="/admin/trainings/sources"
              className={cn(buttonVariants({ variant: "outline" }), "w-full max-w-full sm:w-auto")}
            >
              Bring in a training
            </Link>
            <Link
              href="/admin/assessments"
              className={cn(buttonVariants({ variant: "outline" }), "w-full max-w-full sm:w-auto")}
            >
              Assessments
            </Link>
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Gathering</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Anonymous counts from fathers and leaders. On unless they turn it
            off. Reviewers choose.
          </p>
          {gatheringPreview ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Fathers sharing</dt>
                <dd className="font-heading text-xl font-semibold tabular-nums">
                  {gatheringPreview.fathersSharing}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Leaders sharing</dt>
                <dd className="font-heading text-xl font-semibold tabular-nums">
                  {gatheringPreview.leadersSharing}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sessions completed</dt>
                <dd className="font-heading text-xl font-semibold tabular-nums">
                  {gatheringPreview.sessionsCompleted ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Assignments</dt>
                <dd className="font-heading text-xl font-semibold tabular-nums">
                  {gatheringPreview.assignments ?? "—"}
                </dd>
              </div>
            </dl>
          ) : null}
          <Link
            href="/admin/gathering"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            Open Gathering
          </Link>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Users</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Change roles and deactivate accounts.
          </p>
          <Link
            href="/admin/users"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            Manage users
          </Link>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Support Inbox</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              openSupportCount == null
                ? "Reports from the network."
                : openSupportCount === 0
                  ? "No open reports."
                  : openSupportCount === 1
                    ? "1 open report."
                    : `${openSupportCount} open reports.`,
              openRequestCount == null
                ? null
                : openRequestCount === 0
                  ? "No open training requests."
                  : openRequestCount === 1
                    ? "1 open training request."
                    : `${openRequestCount} open training requests.`,
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/admin/support"
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              Reports
            </Link>
            <Link
              href="/admin/support/requests"
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              Training Requests
            </Link>
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Leader messages</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a short note to Leaders, Reviewers, or both. Fathers never
            see these.
          </p>
          <Link
            href="/admin/messages"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            Open messages
          </Link>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Login background</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign-in is black until you add a panoramic photo. Everyone sees
            the same background.
          </p>
          <Link
            href="/admin/appearance"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            Change login photo
          </Link>
        </div>
      </section>
    </div>
  );
}
