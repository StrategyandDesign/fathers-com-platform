"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { type AppRole } from "@/lib/auth/roles";
import { AppNav } from "@/components/layout/app-nav";
import { interactiveIconClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function StaffMenu({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
          "flex size-11 items-center justify-center rounded-lg text-foreground",
          interactiveIconClassName
        )}
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 outline-none"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-border bg-card p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                className={cn(
                  "flex size-11 items-center justify-center rounded-lg",
                  interactiveIconClassName
                )}
                aria-label="Close menu"
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
