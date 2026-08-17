import { RoleShell } from "@/components/layout/role-shell";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requireRole("reviewer");

  return (
    <RoleShell role={role} email={user.email}>
      {children}
    </RoleShell>
  );
}
