import { OrganizationLogoCard } from "@/components/manager/organization-logo-card";
import { AccountView } from "@/components/layout/account-view";
import { requireRole } from "@/lib/auth/session";
import { loadManagerOrganizationMarks } from "@/lib/org-photos/data";

export default async function ManagerAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user, role } = await requireRole("manager");
  const marks = await loadManagerOrganizationMarks(user.id);

  return (
    <AccountView
      role={role}
      userId={user.id}
      email={user.email}
      error={flash.error}
      notice={flash.notice}
    >
      {marks.map((mark) => (
        <OrganizationLogoCard
          key={mark.groupId}
          groupId={mark.groupId}
          name={mark.name}
          logoUrl={mark.logoUrl}
        />
      ))}
    </AccountView>
  );
}
