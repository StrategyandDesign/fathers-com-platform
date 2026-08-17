import { AccountView } from "@/components/layout/account-view";
import { requireRole } from "@/lib/auth/session";

export default async function AdminAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user, role } = await requireRole("admin");
  return (
    <AccountView
      role={role}
      userId={user.id}
      email={user.email}
      error={flash.error}
      notice={flash.notice}
    />
  );
}
