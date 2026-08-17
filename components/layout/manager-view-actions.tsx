"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/components/i18n/locale-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    href: "/manager/impact",
    labelKey: "nav.impact",
    match: (path: string) => path.startsWith("/manager/impact"),
  },
  {
    href: "/manager/compare",
    labelKey: "nav.compare",
    match: (path: string) => path.startsWith("/manager/compare"),
  },
  {
    href: "/manager/trainings",
    labelKey: "nav.trainings",
    match: (path: string) =>
      path.startsWith("/manager/trainings") ||
      path.startsWith("/manager/reviews") ||
      path.startsWith("/manager/request"),
  },
] as const;

export function ManagerViewActions({
  pendingTrainings = 0,
}: {
  pendingTrainings?: number;
}) {
  const pathname = usePathname();
  const t = useT();

  return (
    <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:justify-end">
      {ACTIONS.map((item, index) => {
        const active = item.match(pathname);
        const emphasize = active || (index === 0 && pathname === "/manager");
        const label =
          item.href === "/manager/trainings" && pendingTrainings > 0
            ? `${t(item.labelKey)} (${pendingTrainings})`
            : t(item.labelKey);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: emphasize ? "default" : "outline" }),
              "w-full sm:w-auto"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
