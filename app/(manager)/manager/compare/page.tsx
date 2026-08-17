import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { compareRows, loadManagerCompare, parseCompareSearchParams } from "@/lib/manager/compare";
import { fieldClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerComparePage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    window?: string;
    left?: string;
    right?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const filters = parseCompareSearchParams(params);
  const comparison = await loadManagerCompare(user.id, filters);
  const rows =
    comparison.left && comparison.right
      ? compareRows(comparison.left, comparison.right)
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Compare</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Two groups, or two time periods. Same numbers as Impact — no extra
            tracking.
          </p>
        </div>
        <Link
          href="/manager/impact"
          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
        >
          Impact Snapshot
        </Link>
      </div>
      <Flash error={params.error || comparison.error} />

      <form
        method="get"
        action="/manager/compare"
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Compare</span>
            <select
              className={fieldClassName}
              name="mode"
              defaultValue={comparison.mode}
            >
              <option value="periods">Time periods</option>
              <option value="groups">Groups</option>
            </select>
          </label>
          {comparison.mode === "periods" ? (
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Window</span>
              <select
                className={fieldClassName}
                name="window"
                defaultValue={comparison.window}
              >
                <option value="month">This month vs last month</option>
                <option value="30">Last 30 days vs previous 30</option>
              </select>
            </label>
          ) : (
            <>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Left</span>
                <select
                  className={fieldClassName}
                  name="left"
                  defaultValue={comparison.left?.key ?? ""}
                >
                  {comparison.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Right</span>
                <select
                  className={fieldClassName}
                  name="right"
                  defaultValue={comparison.right?.key ?? ""}
                >
                  {comparison.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <Button type="submit" className="mt-5 w-full sm:w-auto">
          Update comparison
        </Button>
      </form>

      {comparison.left && comparison.right ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                Left
              </p>
              <h2 className="font-heading mt-2 text-xl font-semibold tracking-tight">
                {comparison.left.label}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{comparison.left.detail}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                Right
              </p>
              <h2 className="font-heading mt-2 text-xl font-semibold tracking-tight">
                {comparison.right.label}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{comparison.right.detail}</p>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-4 sm:px-6">
              <h2 className="font-heading text-lg font-semibold">
                {comparison.left.label} vs {comparison.right.label}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {comparison.mode === "groups"
                  ? "Current members in each group."
                  : "Enrollment is who joined in each window. Start and completion rates are lifetime progress for that join cohort. Certificates count issues in the window."}
              </p>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li
                  key={row.label}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] sm:items-center sm:px-6"
                >
                  <div>
                    <p className="font-medium">{row.label}</p>
                    <p className="text-sm text-muted-foreground">{row.hint}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">{row.left}</p>
                    {row.leftDetail ? (
                      <p className="text-sm text-muted-foreground">{row.leftDetail}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
                      {row.right}
                    </p>
                    {row.rightDetail ? (
                      <p className="text-sm text-muted-foreground">{row.rightDetail}</p>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "text-sm tabular-nums",
                      row.better === "same" ? "text-muted-foreground" : "text-primary"
                    )}
                  >
                    {row.delta}
                    {row.better === "left"
                      ? " left"
                      : row.better === "right"
                        ? " right"
                        : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <EmptyState title="Nothing to compare yet" actionHref="/manager" actionLabel="Open dashboard">
          {comparison.mode === "groups"
            ? "Create a second group, or switch to time periods."
            : "Join activity will show here once fathers are in a group."}
        </EmptyState>
      )}
    </div>
  );
}
