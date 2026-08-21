import { RoleShell } from "@/components/layout/role-shell";
import { StaffMessageRibbon } from "@/components/staff/staff-message-ribbon";
import { loadCurrentAvatarUrl } from "@/lib/account/data";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { loadOpenStaffRibbon } from "@/lib/staff-messages/data";

export const dynamic = "force-dynamic";

export default async function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requireRole("reviewer");
  const { t } = await getI18n();
  const [avatarUrl, ribbon] = await Promise.all([
    loadCurrentAvatarUrl(user.id),
    loadOpenStaffRibbon(user.id),
  ]);

  return (
    <RoleShell
      role={role}
      email={user.email}
      avatarUrl={avatarUrl}
      banner={ribbon.length > 0 ? <StaffMessageRibbon messages={ribbon} t={t} /> : null}
    >
      {children}
    </RoleShell>
  );
}
