import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { loadAdminDashboard } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/session";
import { loadOpenSupportCount } from "@/lib/support/data";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  await requireRole("admin");
  const [summary, openSupportCount] = await Promise.all([
    loadAdminDashboard(),
    loadOpenSupportCount(),
  ]);

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
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
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
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Catalog</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a training. Publish when sessions are ready, then release it to
            managers.
          </p>
          <Link
            href="/admin/trainings/new"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            New training
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
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
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Support Inbox</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {openSupportCount == null
              ? "Reports from fathers, managers, and reviewers."
              : openSupportCount === 0
                ? "No open reports."
                : openSupportCount === 1
                  ? "1 open report."
                  : `${openSupportCount} open reports.`}
          </p>
          <Link
            href="/admin/support"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            Open inbox
          </Link>
        </div>
      </section>
    </div>
  );
}
