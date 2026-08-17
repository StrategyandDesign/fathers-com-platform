import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  children,
  actionHref,
  actionLabel,
  framed = true,
  className,
}: {
  title: string;
  children: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  framed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        framed
          ? "rounded-xl border border-border bg-card p-4 sm:p-6"
          : "p-4 sm:p-6",
        className
      )}
    >
      <p className="font-heading text-lg font-semibold">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{children}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className={cn(buttonVariants(), "mt-5 w-full sm:w-auto")}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
