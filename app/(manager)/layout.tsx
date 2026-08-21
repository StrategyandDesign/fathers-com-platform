import { RoleShell } from "@/components/layout/role-shell";
import { StaffMessageRibbon } from "@/components/staff/staff-message-ribbon";
import { loadCurrentAvatarUrl, loadManagerDisplayTitle } from "@/lib/account/data";
import { managerDisplayTitleLabel } from "@/lib/account/display-title";
import { requireRole } from "@/lib/auth/session";
import { requestPathname } from "@/lib/http/pathname";
import { getI18n } from "@/lib/i18n/server";
import { gateManagerOnboarding } from "@/lib/manager/onboarding-gate";
import { loadOpenStaffRibbon } from "@/lib/staff-messages/data";

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
  const [avatarUrl, displayTitle, ribbon] = await Promise.all([
    loadCurrentAvatarUrl(user.id),
    loadManagerDisplayTitle(user.id),
    onboardingActive ? Promise.resolve([]) : loadOpenStaffRibbon(user.id),
  ]);

  return (
    <RoleShell
      role={role}
      email={user.email}
      avatarUrl={avatarUrl}
      roleLabel={managerDisplayTitleLabel(displayTitle, t)}
      onboardingActive={onboardingActive}
      banner={ribbon.length > 0 ? <StaffMessageRibbon messages={ribbon} t={t} /> : null}
    >
      {children}
    </RoleShell>
  );
}
