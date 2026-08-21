import Link from "next/link";
import type { ReactNode } from "react";

import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminCatalogDesk({
  title,
  lead,
  actions,
  error,
  notice,
  archivedView,
  activeHref,
  archivedHref,
  children,
}: {
  title: string;
  lead: string;
  actions?: ReactNode;
  error?: string;
  notice?: string;
  archivedView: boolean;
  activeHref: string;
  archivedHref: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{lead}</p>
        </div>
        {actions ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{actions}</div>
        ) : null}
      </div>
      <Flash error={error} notice={notice} />

      <div className="flex flex-wrap gap-2">
        <Link
          href={activeHref}
          className={cn(
            buttonVariants({ variant: archivedView ? "outline" : "default", size: "sm" })
          )}
        >
          Active
        </Link>
        <Link
          href={archivedHref}
          className={cn(
            buttonVariants({ variant: archivedView ? "default" : "outline", size: "sm" })
          )}
        >
          Archived
        </Link>
      </div>

      {children}
    </div>
  );
}
