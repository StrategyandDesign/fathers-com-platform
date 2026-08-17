import { RoleShell } from "@/components/layout/role-shell";
import { loadCurrentAvatarUrl } from "@/lib/account/data";
import { requireRole } from "@/lib/auth/session";
import { loadReviewQueue } from "@/lib/manager/reviews";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requireRole("manager");
  const [avatarUrl, reviews] = await Promise.all([
    loadCurrentAvatarUrl(user.id),
    loadReviewQueue(user.id),
  ]);

  return (
    <RoleShell
      role={role}
      email={user.email}
      avatarUrl={avatarUrl}
      pendingTrainings={reviews.pending.length}
    >
      {children}
    </RoleShell>
  );
}
