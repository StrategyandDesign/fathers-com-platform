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
    match: (path: string) =>
      path.startsWith("/manager/impact") || path.startsWith("/manager/compare"),
  },
] as const;

export function ManagerHeaderMenu({
  tone = "page",
}: {
  tone?: "page" | "header";
}) {
  const pathname = usePathname();
  const t = useT();
  const header = tone === "header";

  return (
    <nav
      aria-label={t("nav.dashboardMenu")}
      className="shrink-0 max-w-full"
    >
      <div
        className={cn(
          "flex h-10 items-center gap-0.5 rounded-lg border p-0.5",
          header
            ? "border-header-border bg-header-accent"
            : "border-border bg-card"
        )}
      >
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
                  ? "bg-primary/20 text-primary"
                  : header
                    ? "text-header-muted hover:bg-header-hover hover:text-header-foreground"
                    : "text-muted-foreground hover:bg-hover hover:text-foreground"
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
