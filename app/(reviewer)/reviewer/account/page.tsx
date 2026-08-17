import { AccountView } from "@/components/layout/account-view";
import { requireRole } from "@/lib/auth/session";

export default async function ReviewerAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user, role } = await requireRole("reviewer");
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
