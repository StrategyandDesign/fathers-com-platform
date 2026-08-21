"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useT } from "@/components/i18n/locale-provider";
import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "fc_manager_companion";

export function CompanionFrame({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "0") setOpen(false);
    } catch {
      // sessionStorage can be blocked; default stays open.
    }
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage failures; collapse still works for this view.
    }
  }

  return (
    <section className="rounded-xl border border-primary/35 bg-card p-4 sm:p-6 print:hidden">
      <button
        type="button"
        className={cn(
          "flex w-full items-start justify-between gap-3 text-start",
          interactiveControlClassName
        )}
        aria-expanded={open}
        aria-label={open ? t("manager.companion.collapse") : t("manager.companion.expand")}
        onClick={toggle}
      >
        <div className="min-w-0">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            {t("manager.companion.eyebrow")}
          </p>
          <h2 className="font-heading mt-2 text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lead}</p>
        </div>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? <div className="mt-5 space-y-5">{children}</div> : null}
    </section>
  );
}
