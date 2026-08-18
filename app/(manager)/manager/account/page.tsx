import Link from "next/link";

import { OrganizationLogoCard } from "@/components/manager/organization-logo-card";
import { AccountView } from "@/components/layout/account-view";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerOrganizationMarks } from "@/lib/org-photos/data";
import { cn } from "@/lib/utils";

export default async function ManagerAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user, role } = await requireRole("manager");
  const { t } = await getI18n();
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
      <Link
        href="/manager/account/photos"
        className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
      >
        {t("account.managePhotos")}
      </Link>
    </AccountView>
  );
}
