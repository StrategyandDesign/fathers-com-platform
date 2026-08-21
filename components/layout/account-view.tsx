import Link from "next/link";

import { AnonymousShareToggle } from "@/components/account/anonymous-share-toggle";
import { DisplayNameForm } from "@/components/account/display-name-form";
import { DisplayTitleForm } from "@/components/account/display-title-form";
import { NotificationPrefs } from "@/components/account/notification-prefs";
import { PaletteForm } from "@/components/account/palette-form";
import { LanguageForm } from "@/components/i18n/language-form";
import { LegalLinks } from "@/components/legal/legal-links";
import { Flash } from "@/components/manager/flash";
import { UserAvatar } from "@/components/layout/user-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { managerDisplayTitleLabel } from "@/lib/account/display-title";
import { loadAccountState, loadOrganizationName } from "@/lib/account/data";
import { loadFatherLeader } from "@/lib/cohort-note/data";
import { signOut } from "@/lib/auth/actions";
import { ROLE_HELP, type AppRole } from "@/lib/auth/roles";
import { SHOW_HEBREW } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
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
  const [account, organizationName, leader] = await Promise.all([
    loadAccountState(userId),
    role === "father" ? loadOrganizationName(userId) : Promise.resolve(null),
    role === "father" ? loadFatherLeader(userId) : Promise.resolve(null),
  ]);
  const identityLabel =
    role === "father"
      ? organizationName?.trim() || null
      : role === "manager"
        ? managerDisplayTitleLabel(account.displayTitle, t)
        : t(`role.${role}`);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("account.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === "manager"
            ? t("account.managerLead")
            : role === "father"
              ? t("account.fatherLead")
              : role === "reviewer"
                ? t("account.reviewerLead")
                : t("account.staffLead")}
        </p>
      </header>
      <Flash error={error} notice={notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <UserAvatar
            name={account.fullName || email}
            className="size-16 text-xl font-semibold sm:size-20 sm:text-2xl"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-heading truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {account.fullName || email?.split("@")[0] || t("account.title")}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {[email, identityLabel].filter(Boolean).join(" · ")}
            </p>
            {leader ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <UserAvatar
                  name={leader.name}
                  src={leader.avatarUrl}
                  className="size-6 text-[10px]"
                />
                <span>{t("account.leaderLabel", { name: leader.name })}</span>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <PaletteForm />

      {role === "manager" ? (
        <>
          <DisplayNameForm savedName={account.fullName?.trim() ?? ""} />
          <DisplayTitleForm savedTitle={account.displayTitle} />
        </>
      ) : null}

      {SHOW_HEBREW ? <LanguageForm savedLocale={account.locale} /> : null}

      {role !== "admin" ? (
        <AnonymousShareToggle role={role} initial={account.shareAnonymousAdmin} />
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

      <NotificationPrefs role={role} initial={account.preferences} schedule={account.schedule} />

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
