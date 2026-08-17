import { RoleShell } from "@/components/layout/role-shell";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requireRole("manager");

  return (
    <RoleShell role={role} email={user.email}>
      {children}
    </RoleShell>
  );
}
