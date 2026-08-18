import Link from "next/link";

import { OrganizationLogoCard } from "@/components/manager/organization-logo-card";
import { OrganizationPhotoSlot } from "@/components/manager/organization-photo-slot";
import { Flash } from "@/components/manager/flash";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { photoPackForCode } from "@/lib/brand/photos";
import {
  loadManagerOrganizationMarks,
  loadManagerOrganizationPhotos,
} from "@/lib/org-photos/data";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerOrganizationPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const { t } = await getI18n();
  const [sections, marks] = await Promise.all([
    loadManagerOrganizationPhotos(user.id),
    loadManagerOrganizationMarks(user.id),
  ]);
  const logos = new Map(marks.map((mark) => [mark.groupId, mark]));
  const single = sections.length === 1 ? sections[0] : null;
  const singleName = single?.organization.name.trim();
  const singleUsesPlaceholders = single
    ? photoPackForCode(single.organization.code) === "il"
    : false;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/manager"
          className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
        >
          {t("manager.photos.backDashboard")}
        </Link>
        <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight">
          {t("manager.photos.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {singleName
            ? t(
                singleUsesPlaceholders
                  ? "manager.photos.leadPlaceholder"
                  : "manager.photos.leadOne",
                { name: singleName }
              )
            : t("manager.photos.leadMany")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{t("manager.photos.logoAndCode")}</p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      {sections.length === 0 ? (
        <EmptyState
          title={t("manager.photos.emptyTitle")}
          actionHref="/manager"
          actionLabel={t("manager.photos.openDashboard")}
        >
          {t("manager.photos.emptyBody")}
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => {
            const orgName = section.organization.name.trim() || t("manager.photos.thisOrg");
            const mark = logos.get(section.organization.id);
            return (
              <section key={section.organization.id} className="space-y-4">
                {sections.length > 1 ? (
                  <div>
                    <h2 className="font-heading text-lg font-semibold tracking-tight">
                      {orgName}
                    </h2>
                    <p className="mt-1 font-mono text-sm tracking-wide text-muted-foreground">
                      {section.organization.invite_code}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("manager.photos.appliesOnly", { name: orgName })}
                    </p>
                  </div>
                ) : (
                  <p className="font-mono text-sm tracking-wide text-muted-foreground">
                    {t("manager.photos.inviteCode", {
                      code: section.organization.invite_code,
                    })}
                  </p>
                )}
                <OrganizationLogoCard
                  groupId={section.organization.id}
                  name={mark?.name ?? orgName}
                  logoUrl={mark?.logoUrl ?? null}
                />
                {section.slots.map((view) => (
                  <OrganizationPhotoSlot
                    key={view.slot}
                    groupId={section.organization.id}
                    orgName={orgName}
                    view={view}
                    usesPlaceholders={photoPackForCode(section.organization.code) === "il"}
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
