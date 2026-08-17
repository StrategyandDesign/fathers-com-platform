import Link from "next/link";

import { AvatarUpload } from "@/components/account/avatar-upload";
import { NotificationPrefs } from "@/components/account/notification-prefs";
import { LanguageForm } from "@/components/i18n/language-form";
import { LegalLinks } from "@/components/legal/legal-links";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { loadAccountState, loadOrganizationName } from "@/lib/account/data";
import { signOut } from "@/lib/auth/actions";
import { ROLE_HELP, type AppRole } from "@/lib/auth/roles";
import { photoPackForCode } from "@/lib/brand/photos";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerGroups } from "@/lib/manager/data";
import { cn } from "@/lib/utils";

export async function AccountView({
  role,
  userId,
  email,
  error,
  notice,
  children,
}: {
  role: AppRole;
  userId: string;
  email?: string | null;
  error?: string;
  notice?: string;
  children?: React.ReactNode;
}) {
  const { t } = await getI18n();
  const [account, organizationName, managedOrgs] = await Promise.all([
    loadAccountState(userId),
    role === "father" ? loadOrganizationName(userId) : Promise.resolve(null),
    role === "manager" ? loadManagerGroups(userId) : Promise.resolve([]),
  ]);
  const identityLabel = role === "father" ? organizationName?.trim() || null : t(`role.${role}`);
  const managedNames = managedOrgs
    .map((organization) => organization.name.trim())
    .filter(Boolean);
  const photosLabel =
    managedNames.length === 1
      ? t(
          photoPackForCode(managedOrgs[0]?.code) === "il"
            ? "account.orgPhotosPlaceholder"
            : "account.orgPhotosOne",
          { name: managedNames[0] }
        )
      : managedNames.length > 1
        ? t("account.orgPhotosMany", { names: managedNames.join(" · ") })
        : t("account.orgPhotosFallback");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("account.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === "manager"
            ? t("account.managerLead")
            : role === "father"
              ? t("account.fatherLead")
              : t("account.staffLead")}
        </p>
      </header>
      <Flash error={error} notice={notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <AvatarUpload
          name={account.fullName}
          email={email}
          avatarUrl={account.avatarUrl}
          caption={identityLabel}
        />
      </section>

      <LanguageForm savedLocale={account.locale} />

      {role === "manager" ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("account.orgPhotos")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{photosLabel}</p>
          <Link
            href="/manager/account/photos"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            {t("account.managePhotos")}
          </Link>
        </section>
      ) : null}

      {children}

      {role === "manager" ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("account.requestTraining")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("account.requestTrainingLead")}</p>
          <Link
            href="/manager/request"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            {t("account.requestTraining")}
          </Link>
        </section>
      ) : null}

      <NotificationPrefs role={role} initial={account.preferences} />

      {role === "admin" ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("account.supportInbox")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("account.supportInboxLead")}</p>
          <Link
            href="/admin/support"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            {t("account.openInbox")}
          </Link>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">{t("account.help")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("account.helpLead")}</p>
          <Link
            href={ROLE_HELP[role]}
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            {t("account.reportProblem")}
          </Link>
        </section>
      )}

      <footer className="border-t border-border pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form action={signOut}>
            <Button type="submit" variant="destructive" className="w-full sm:w-auto">
              {t("auth.signOut")}
            </Button>
          </form>
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}
