"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { useT } from "@/components/i18n/locale-provider";
import { type AppRole } from "@/lib/auth/roles";
import { AppNav } from "@/components/layout/app-nav";
import { headerIconClassName, interactiveIconClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function StaffMenu({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className={cn(
          "flex size-11 items-center justify-center rounded-lg",
          headerIconClassName
        )}
        aria-label={t("nav.openMenu")}
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-overlay outline-none"
            aria-label={t("nav.closeMenu")}
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 flex w-[min(18rem,88vw)] flex-col border-e border-border bg-card p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                className={cn(
                  "flex size-11 items-center justify-center rounded-lg",
                  interactiveIconClassName
                )}
                aria-label={t("nav.closeMenu")}
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <AppNav role={role} layout="list" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
