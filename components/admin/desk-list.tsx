import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function AdminDeskList({
  countHeader,
  actionHeader,
  empty,
  children,
}: {
  countHeader: string;
  actionHeader: string;
  empty?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {empty ? (
        empty
      ) : (
        <ul>
          <li className="hidden border-b border-border text-xs tracking-wide text-muted-foreground uppercase md:grid md:grid-cols-[minmax(0,1fr)_5.5rem]">
            <div className="grid grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(10rem,1fr)] gap-4 px-6 py-3">
              <span>Title</span>
              <span>{countHeader}</span>
              <span>Development</span>
            </div>
            <span className="flex items-center justify-end px-4">{actionHeader}</span>
          </li>
          {children}
        </ul>
      )}
    </div>
  );
}

export function AdminDeskRow({
  href,
  title,
  count,
  countLabel,
  development,
  release,
  actionHref,
  actionLabel,
  children,
}: {
  href: string;
  title: string;
  count: number;
  countLabel: string;
  development: ReactNode;
  release: ReactNode;
  actionHref: string;
  actionLabel: string;
  children?: ReactNode;
}) {
  return (
    <li className="grid items-stretch border-b border-border last:border-0 md:grid-cols-[minmax(0,1fr)_5.5rem]">
      <Link
        href={href}
        className={cn(
          "grid gap-2 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(10rem,1fr)] md:items-center",
          interactiveSurfaceClassName
        )}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{title}</span>
          {children}
        </span>
        <span className="flex items-baseline justify-between gap-3 text-sm md:block">
          <span className="text-muted-foreground md:hidden">{countLabel}</span>
          <span className="tabular-nums">{count}</span>
        </span>
        <span className="space-y-1 text-sm">
          <span className="flex items-baseline justify-between gap-3 md:block">
            <span className="text-muted-foreground md:hidden">Development</span>
            {development}
          </span>
          <span className="block">{release}</span>
        </span>
      </Link>
      <div className="flex items-center px-4 pb-4 sm:px-6 md:justify-end md:px-4 md:py-0">
        <Link
          href={actionHref}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full md:w-auto")}
        >
          {actionLabel}
        </Link>
      </div>
    </li>
  );
}
