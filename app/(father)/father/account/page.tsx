import Link from "next/link";

import { IssuedCertificateList } from "@/components/certificates/issued-list";
import { AccountView } from "@/components/layout/account-view";
import { requireRole } from "@/lib/auth/session";
import { loadFatherCertificates } from "@/lib/certificates/data";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function FatherAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user, role } = await requireRole("father");
  const certificates = await loadFatherCertificates(user.id);

  return (
    <AccountView
      role={role}
      userId={user.id}
      email={user.email}
      error={flash.error}
      notice={flash.notice}
    >
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold">Certificates</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Issued by your manager. Download the official PDF.
            </p>
          </div>
          <Link
            href="/father/certificates"
            className={cn(
              "inline-flex min-h-11 items-center text-sm text-muted-foreground",
              interactiveLinkClassName
            )}
          >
            View all
          </Link>
        </div>
        <IssuedCertificateList
          certificates={certificates}
          empty="Certificates appear after your manager issues one for a completed training."
          actionHref="/father/trainings"
          actionLabel="View trainings"
        />
      </section>
    </AccountView>
  );
}
