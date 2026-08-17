import { RoleShell } from "@/components/layout/role-shell";
import { loadCurrentAvatarUrl, loadOrganizationName } from "@/lib/account/data";
import { ensureFatherGroupJoin } from "@/lib/auth/group-join";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function FatherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requireRole("father");
  await ensureFatherGroupJoin(user);
  const [avatarUrl, organizationName] = await Promise.all([
    loadCurrentAvatarUrl(user.id),
    loadOrganizationName(user.id),
  ]);

  return (
    <RoleShell
      role={role}
      email={user.email}
      avatarUrl={avatarUrl}
      organizationName={organizationName}
    >
      {children}
    </RoleShell>
  );
}
