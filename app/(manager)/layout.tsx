import { RoleShell } from "@/components/layout/role-shell";
import { loadCurrentAvatarUrl, loadManagerDisplayTitle } from "@/lib/account/data";
import { managerDisplayTitleLabel } from "@/lib/account/display-title";
import { requireRole } from "@/lib/auth/session";
import { requestPathname } from "@/lib/http/pathname";
import { getI18n } from "@/lib/i18n/server";
import { gateManagerOnboarding } from "@/lib/manager/onboarding-gate";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requireRole("manager");
  const pathname = await requestPathname();
  const { active: onboardingActive } = await gateManagerOnboarding(user.id, pathname);
  const { t } = await getI18n();
  const [avatarUrl, displayTitle] = await Promise.all([
    loadCurrentAvatarUrl(user.id),
    loadManagerDisplayTitle(user.id),
  ]);

  return (
    <RoleShell
      role={role}
      email={user.email}
      avatarUrl={avatarUrl}
      roleLabel={managerDisplayTitleLabel(displayTitle, t)}
      onboardingActive={onboardingActive}
    >
      {children}
    </RoleShell>
  );
}
