import { RoleShell } from "@/components/layout/role-shell";
import { loadCurrentAvatarUrl } from "@/lib/account/data";
import { ensureFatherGroupJoin } from "@/lib/auth/group-join";
import { requireRole } from "@/lib/auth/session";
import { loadFatherOrganizationMark } from "@/lib/org-photos/data";

export const dynamic = "force-dynamic";

export default async function FatherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requireRole("father");
  await ensureFatherGroupJoin(user);
  const [avatarUrl, organization] = await Promise.all([
    loadCurrentAvatarUrl(user.id),
    loadFatherOrganizationMark(user.id),
  ]);

  return (
    <RoleShell
      role={role}
      email={user.email}
      avatarUrl={avatarUrl}
      organizationName={organization?.name}
      organizationLogoUrl={organization?.logoUrl}
    >
      {children}
    </RoleShell>
  );
}
