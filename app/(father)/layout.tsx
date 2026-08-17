import { RoleShell } from "@/components/layout/role-shell";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function FatherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requireRole("father");

  return (
    <RoleShell role={role} email={user.email}>
      {children}
    </RoleShell>
  );
}
