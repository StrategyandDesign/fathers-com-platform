"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Home,
  Inbox,
  LayoutDashboard,
  Settings,
  User,
  Users,
} from "lucide-react";

import { BrandLogoArrow } from "@/components/brand/logo-arrow";
import { useT } from "@/components/i18n/locale-provider";
import { type AppRole } from "@/lib/auth/roles";
import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

type NavIcon = ComponentType<{
  className?: string;
  strokeWidth?: number;
}>;

type NavItem = {
  href: string;
  labelKey: string;
  icon: NavIcon;
  match: (pathname: string) => boolean;
};

export const NAV: Record<AppRole, NavItem[]> = {
  father: [
    {
      href: "/father",
      labelKey: "nav.home",
      icon: Home,
      match: (path) => path === "/father" || path === "/home",
    },
    {
      href: "/father/trainings",
      labelKey: "nav.trainings",
      icon: BrandLogoArrow,
      match: (path) => path === "/father/trainings" || path.startsWith("/father/sessions"),
    },
    {
      href: "/father/profile",
      labelKey: "nav.profile",
      icon: User,
      match: (path) => path.startsWith("/father/profile"),
    },
  ],
  manager: [
    {
      href: "/manager",
      labelKey: "nav.dashboard",
      icon: LayoutDashboard,
      match: (path) => path === "/manager",
    },
    {
      href: "/manager/participants",
      labelKey: "nav.participants",
      icon: Users,
      match: (path) => path.startsWith("/manager/participants"),
    },
    {
      href: "/manager/assessments",
      labelKey: "nav.assessments",
      icon: ClipboardList,
      match: (path) => path.startsWith("/manager/assessments"),
    },
    {
      href: "/manager/reports",
      labelKey: "nav.reports",
      icon: FileSpreadsheet,
      match: (path) => path.startsWith("/manager/reports"),
    },
    {
      href: "/manager/account",
      labelKey: "nav.account",
      icon: Settings,
      match: (path) => path.startsWith("/manager/account"),
    },
  ],
  reviewer: [
    {
      href: "/reviewer",
      labelKey: "nav.insights",
      icon: BarChart3,
      match: (path) => path === "/reviewer" || path.startsWith("/reviewer/summary"),
    },
    {
      href: "/reviewer/account",
      labelKey: "nav.account",
      icon: Settings,
      match: (path) => path.startsWith("/reviewer/account"),
    },
  ],
  admin: [
    {
      href: "/admin",
      labelKey: "nav.dashboard",
      icon: LayoutDashboard,
      match: (path) => path === "/admin",
    },
    {
      href: "/admin/organizations",
      labelKey: "nav.organizations",
      icon: Building2,
      match: (path) => path.startsWith("/admin/organizations"),
    },
    {
      href: "/admin/trainings",
      labelKey: "nav.trainings",
      icon: GraduationCap,
      match: (path) => path.startsWith("/admin/trainings"),
    },
    {
      href: "/admin/users",
      labelKey: "nav.users",
      icon: Users,
      match: (path) => path.startsWith("/admin/users"),
    },
    {
      href: "/admin/support",
      labelKey: "nav.inbox",
      icon: Inbox,
      match: (path) => path.startsWith("/admin/support"),
    },
    {
      href: "/admin/account",
      labelKey: "nav.account",
      icon: Settings,
      match: (path) => path.startsWith("/admin/account"),
    },
  ],
};

export function AppNav({
  role,
  layout = "side",
}: {
  role: AppRole;
  layout?: "side" | "tabs" | "list";
}) {
  const pathname = usePathname();
  const t = useT();
  const items = NAV[role];

  return (
    <nav
      className={cn(
        layout === "side" && "flex flex-col items-center gap-2 px-2 py-4",
        layout === "tabs" && "grid h-[3.75rem] grid-cols-3",
        layout === "list" && "flex flex-col gap-1"
      )}
    >
      {items.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center focus-visible:z-10",
              interactiveControlClassName,
              layout === "side" &&
                "w-full flex-col gap-1 rounded-lg px-1 py-2.5 text-[11px] tracking-wide",
              layout === "tabs" &&
                "h-full min-h-11 flex-col justify-center gap-0.5 px-1 text-[11px] leading-tight",
              layout === "list" && "min-h-11 gap-3 rounded-lg px-3 text-sm",
              layout === "side" &&
                (active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"),
              layout === "tabs" &&
                (active
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"),
              layout === "list" &&
                (active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground")
            )}
          >
            <Icon className={cn("size-5", layout === "tabs" && "size-[22px]")} strokeWidth={1.6} />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
