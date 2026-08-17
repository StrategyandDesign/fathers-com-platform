import Link from "next/link";

import { OrganizationPhotoSlot } from "@/components/manager/organization-photo-slot";
import { Flash } from "@/components/manager/flash";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { loadManagerOrganizationPhotos } from "@/lib/org-photos/data";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerOrganizationPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const sections = await loadManagerOrganizationPhotos(user.id);
  const single = sections.length === 1 ? sections[0] : null;
  const singleName = single?.organization.name.trim();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/manager/account"
          className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
        >
          Account
        </Link>
        <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight">
          Organization Photos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {singleName
            ? `Replace the photos ${singleName} participants see on Home and Trainings. Any photo works — we fit it to the card.`
            : "Replace the photos each organization sees on Home and Trainings. Any photo works — we fit it to the card."}
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      {sections.length === 0 ? (
        <EmptyState
          title="No organization yet"
          actionHref="/manager"
          actionLabel="Open Dashboard"
        >
          Create a group on the Dashboard first. Photos are scoped to that
          organization.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => {
            const orgName = section.organization.name.trim() || "this organization";
            return (
              <section key={section.organization.id} className="space-y-4">
                {sections.length > 1 ? (
                  <div>
                    <h2 className="font-heading text-lg font-semibold tracking-tight">
                      {orgName}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These photos apply only to {orgName}.
                    </p>
                  </div>
                ) : null}
                {section.slots.map((view) => (
                  <OrganizationPhotoSlot
                    key={view.slot}
                    groupId={section.organization.id}
                    orgName={orgName}
                    view={view}
                  />
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
