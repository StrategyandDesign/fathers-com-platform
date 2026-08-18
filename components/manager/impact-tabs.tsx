import Link from "next/link";

import { getI18n } from "@/lib/i18n/server";
import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export async function ImpactTabs({
  current,
}: {
  current: "snapshot" | "compare";
}) {
  const { t } = await getI18n();
  const items = [
    { href: "/manager/impact", key: "snapshot" as const, label: t("manager.impact.tabSnapshot") },
    {
      href: "/manager/impact?tab=compare",
      key: "compare" as const,
      label: t("manager.impact.tabCompare"),
    },
  ];

  return (
    <nav aria-label={t("manager.impact.tabs")} className="print:hidden">
      <div className="inline-flex h-10 max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-card p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.key === current;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-md px-3 text-xs whitespace-nowrap sm:px-3.5",
                interactiveControlClassName,
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
