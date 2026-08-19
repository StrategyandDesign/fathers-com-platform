import { BrandLogo } from "@/components/brand/logo";
import { OrganizationMark } from "@/components/brand/organization-mark";
import { AccountMenu } from "@/components/layout/account-menu";
import { AppNav } from "@/components/layout/app-nav";
import { ManagerHeaderMenu } from "@/components/layout/manager-header-menu";
import { StaffMenu } from "@/components/layout/staff-menu";
import { Badge } from "@/components/ui/badge";
import { ROLE_HOME, type AppRole } from "@/lib/auth/roles";
import { isFatherStartPath } from "@/lib/father/onboarding";
import { requestPathname } from "@/lib/http/pathname";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export async function RoleShell({
  role,
  email,
  avatarUrl,
  organizationName,
  organizationLogoUrl,
  roleLabel,
  onboardingActive = false,
  children,
}: {
  role: AppRole;
  email?: string | null;
  avatarUrl?: string | null;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  roleLabel?: string | null;
  onboardingActive?: boolean;
  children: React.ReactNode;
}) {
  const { t } = await getI18n();
  const pathname = await requestPathname();
  const startFlow = role === "father" && isFatherStartPath(pathname);
  const funnel = startFlow || (role === "father" && onboardingActive);
  const fatherMobile = role === "father" && !funnel;
  const managerMobileNav = role === "manager";
  const chromeLabel = role === "father" ? null : roleLabel?.trim() || t(`role.${role}`);
  const groupName = role === "father" && !startFlow ? organizationName?.trim() || null : null;
  const groupLogo = role === "father" && !startFlow ? organizationLogoUrl ?? null : null;

  return (
    <div className="min-h-svh bg-background">
      <header className="fixed inset-x-0 top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b border-header-border bg-header px-3 pt-[env(safe-area-inset-top)] text-header-foreground print:hidden lg:px-5">
        <div className="flex min-w-0 shrink-0 items-center gap-1.5 lg:gap-3">
          {role !== "father" && role !== "manager" ? <StaffMenu role={role} /> : null}
          <BrandLogo
            href={funnel ? "/father/start" : ROLE_HOME[role]}
            tone="header"
          />
          {groupName ? (
            <p className="hidden min-w-0 max-w-[12rem] truncate text-sm text-header-muted sm:block">
              {groupName}
            </p>
          ) : null}
          {chromeLabel ? (
            <Badge variant="header" className="hidden max-w-[14rem] truncate lg:inline-flex">
              {chromeLabel}
            </Badge>
          ) : null}
        </div>
        {role === "manager" ? (
          <div className="hidden min-w-0 flex-1 justify-end overflow-x-auto md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="shrink-0">
              <ManagerHeaderMenu tone="header" />
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}
        <div className="ms-auto flex shrink-0 justify-end">
          <AccountMenu
            role={role}
            email={email}
            avatarUrl={avatarUrl}
            chromeLabel={chromeLabel}
          />
        </div>
      </header>

      {managerMobileNav ? (
        <div className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-b border-border bg-background/90 backdrop-blur-md print:hidden lg:hidden">
          <AppNav role={role} layout="bar" />
        </div>
      ) : null}

      {funnel ? null : (
        <aside className="fixed bottom-0 start-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-20 hidden w-[5.5rem] flex-col overflow-y-auto border-e border-sidebar-border bg-sidebar print:hidden lg:flex">
          {role === "father" && groupLogo ? (
            <div className="flex justify-center px-2 pt-4">
              {/* Uploaded group mark lives only here, above Home — not beside the Fathers lockup. */}
              <OrganizationMark name={groupName} logoUrl={groupLogo} size="icon" />
            </div>
          ) : null}
          <AppNav role={role} layout="side" />
        </aside>
      )}

      {fatherMobile ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden lg:hidden">
          <AppNav role={role} layout="tabs" />
        </div>
      ) : null}

      <main
        className={cn(
          "min-h-svh overflow-x-clip",
          managerMobileNav
            ? "pt-[calc(6.5rem+env(safe-area-inset-top))] lg:pt-[calc(3.5rem+env(safe-area-inset-top))]"
            : "pt-[calc(3.5rem+env(safe-area-inset-top))]",
          funnel ? "print:pt-0" : "lg:ps-[5.5rem] print:pt-0 print:ps-0",
          fatherMobile
            ? "max-lg:pb-[calc(3.75rem+env(safe-area-inset-bottom))]"
            : "max-lg:pb-6"
        )}
      >
        <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-5 sm:px-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
