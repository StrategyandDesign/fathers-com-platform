import { RoleShell } from "@/components/layout/role-shell";
import { loadCurrentAvatarUrl } from "@/lib/account/data";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function FatherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requireRole("father");
  const avatarUrl = await loadCurrentAvatarUrl(user.id);

  return (
    <RoleShell role={role} email={user.email} avatarUrl={avatarUrl}>
      {children}
    </RoleShell>
  );
}
