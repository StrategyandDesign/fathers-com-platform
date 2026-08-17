"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/components/i18n/locale-provider";
import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    href: "/manager",
    labelKey: "nav.dashboard",
    match: (path: string) => path === "/manager",
  },
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
] as const;

export function ManagerHeaderMenu() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav
      aria-label={t("nav.dashboardMenu")}
      className="shrink-0 max-w-full"
    >
      <div className="flex h-10 items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-md px-2.5 text-xs whitespace-nowrap sm:px-3",
                interactiveControlClassName,
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
