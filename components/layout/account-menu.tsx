"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronDown } from "lucide-react";

import { useT } from "@/components/i18n/locale-provider";
import { UserAvatar } from "@/components/layout/user-avatar";
import { PaletteSwitcher } from "@/components/theme/palette-switcher";
import { signOut } from "@/lib/auth/actions";
import { ROLE_ACCOUNT, type AppRole } from "@/lib/auth/roles";
import { headerIconClassName, interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function AccountMenu({
  role,
  email,
  avatarUrl,
  chromeLabel,
}: {
  role: AppRole;
  email?: string | null;
  avatarUrl?: string | null;
  chromeLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const label = email || chromeLabel || t("account.title");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full text-header-foreground lg:border lg:border-header-border lg:bg-header-accent lg:px-2 lg:py-1 lg:pe-3 lg:text-sm",
          headerIconClassName
        )}
        aria-label={t("account.openMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <UserAvatar
          name={label}
          src={avatarUrl}
          className="size-10 bg-white/10 text-xs font-medium text-white lg:size-7"
        />
        {email || chromeLabel ? (
          <span className="hidden max-w-[12rem] truncate lg:inline">
            {email ?? chromeLabel}
          </span>
        ) : null}
        <ChevronDown
          aria-hidden
          className={cn(
            "hidden size-4 shrink-0 text-header-muted lg:block",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("account.openMenu")}
          className="absolute end-0 top-[calc(100%+0.5rem)] z-50 w-[min(18.5rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <div className="min-w-0 px-1 pb-3">
            <p className="truncate text-sm font-medium">{label}</p>
            {chromeLabel && email ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{chromeLabel}</p>
            ) : null}
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {t("account.palette")}
            </p>
            <div className="mt-2">
              <PaletteSwitcher compact />
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-1">
            <Link
              href={ROLE_ACCOUNT[role]}
              role="menuitem"
              className={cn(
                "flex min-h-11 items-center rounded-lg px-3 text-sm",
                interactiveControlClassName,
                "hover:bg-hover"
              )}
              onClick={() => setOpen(false)}
            >
              {t("nav.account")}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                role="menuitem"
                className={cn(
                  "flex min-h-11 w-full items-center rounded-lg px-3 text-start text-sm text-destructive",
                  interactiveControlClassName,
                  "hover:bg-hover"
                )}
              >
                {t("auth.signOut")}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
