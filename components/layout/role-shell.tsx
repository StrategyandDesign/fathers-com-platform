import Link from "next/link";

import { ROLE_ACCOUNT, ROLE_HELP, ROLE_HOME, roleChromeLabel, type AppRole } from "@/lib/auth/roles";
import { BrandLogo } from "@/components/brand/logo";
import { AppNav } from "@/components/layout/app-nav";
import { StaffMenu } from "@/components/layout/staff-menu";
import { UserAvatar } from "@/components/layout/user-avatar";
import { Badge } from "@/components/ui/badge";
import { interactiveIconClassName, interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function RoleShell({
  role,
  email,
  avatarUrl,
  organizationName,
  children,
}: {
  role: AppRole;
  email?: string | null;
  avatarUrl?: string | null;
  organizationName?: string | null;
  children: React.ReactNode;
}) {
  const fatherMobile = role === "father";
  const chromeLabel = roleChromeLabel(role, organizationName);

  return (
    <div className="min-h-svh bg-background">
      <header className="fixed inset-x-0 top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-border bg-background/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md print:hidden lg:px-5">
        <div className="flex min-w-0 items-center gap-1.5 lg:gap-3">
          {role !== "father" ? <StaffMenu role={role} /> : null}
          <BrandLogo href={ROLE_HOME[role]} />
          {chromeLabel ? (
            <Badge variant="secondary" className="hidden max-w-[14rem] truncate lg:inline-flex">
              {chromeLabel}
            </Badge>
          ) : null}
        </div>
        <Link
          href={ROLE_ACCOUNT[role]}
          className={cn(
            "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full lg:border lg:border-border lg:bg-card lg:px-2 lg:py-1 lg:pr-3 lg:text-sm",
            interactiveIconClassName
          )}
        >
          <UserAvatar
            name={email}
            src={avatarUrl}
            className="size-10 text-xs font-medium lg:size-7"
          />
          {email || chromeLabel ? (
            <span className="hidden max-w-[12rem] truncate lg:inline">
              {email ?? chromeLabel}
            </span>
          ) : null}
        </Link>
      </header>

      <aside className="fixed bottom-0 left-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-20 hidden w-[5.5rem] flex-col border-r border-border bg-sidebar print:hidden lg:flex">
        <AppNav role={role} layout="side" />
      </aside>

      {fatherMobile ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden lg:hidden">
          <AppNav role={role} layout="tabs" />
        </div>
      ) : null}

      <main
        className={cn(
          "min-h-svh overflow-x-clip pt-[calc(3.5rem+env(safe-area-inset-top))]",
          "lg:pl-[5.5rem] print:pt-0 print:pl-0",
          fatherMobile
            ? "max-lg:pb-[calc(3.75rem+env(safe-area-inset-bottom))]"
            : "max-lg:pb-6"
        )}
      >
        <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-5 sm:px-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
          {children}
          {role !== "admin" ? (
            <p className="mt-10 border-t border-border pt-4 print:hidden">
              <Link
                href={ROLE_HELP[role]}
                className={cn(
                  "inline-flex min-h-11 items-center text-sm text-muted-foreground",
                  interactiveLinkClassName
                )}
              >
                Help
              </Link>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
