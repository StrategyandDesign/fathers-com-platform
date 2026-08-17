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
  LayoutDashboard,
  Settings,
  User,
  Users,
} from "lucide-react";

import { BrandLogoArrow } from "@/components/brand/logo-arrow";
import { type AppRole } from "@/lib/auth/roles";
import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

type NavIcon = ComponentType<{
  className?: string;
  strokeWidth?: number;
}>;

type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  match: (pathname: string) => boolean;
};

export const NAV: Record<AppRole, NavItem[]> = {
  father: [
    {
      href: "/father",
      label: "Home",
      icon: Home,
      match: (path) => path === "/father" || path === "/home",
    },
    {
      href: "/father/trainings",
      label: "Trainings",
      icon: BrandLogoArrow,
      match: (path) => path === "/father/trainings" || path.startsWith("/father/sessions"),
    },
    {
      href: "/father/profile",
      label: "Profile",
      icon: User,
      match: (path) => path.startsWith("/father/profile"),
    },
  ],
  manager: [
    {
      href: "/manager",
      label: "Dashboard",
      icon: LayoutDashboard,
      match: (path) => path === "/manager",
    },
    {
      href: "/manager/participants",
      label: "Participants",
      icon: Users,
      match: (path) => path.startsWith("/manager/participants"),
    },
    {
      href: "/manager/assessments",
      label: "Assessments",
      icon: ClipboardList,
      match: (path) => path.startsWith("/manager/assessments"),
    },
    {
      href: "/manager/reports",
      label: "Reports",
      icon: FileSpreadsheet,
      match: (path) => path.startsWith("/manager/reports"),
    },
    {
      href: "/manager/account",
      label: "Account",
      icon: Settings,
      match: (path) => path.startsWith("/manager/account"),
    },
  ],
  reviewer: [
    {
      href: "/reviewer",
      label: "Insights",
      icon: BarChart3,
      match: (path) => path === "/reviewer",
    },
    {
      href: "/reviewer/account",
      label: "Account",
      icon: Settings,
      match: (path) => path.startsWith("/reviewer/account"),
    },
  ],
  admin: [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      match: (path) => path === "/admin",
    },
    {
      href: "/admin/organizations",
      label: "Organizations",
      icon: Building2,
      match: (path) => path.startsWith("/admin/organizations"),
    },
    {
      href: "/admin/trainings",
      label: "Trainings",
      icon: GraduationCap,
      match: (path) => path.startsWith("/admin/trainings"),
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      match: (path) => path.startsWith("/admin/users"),
    },
    {
      href: "/admin/account",
      label: "Account",
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
