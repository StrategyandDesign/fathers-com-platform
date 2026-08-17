import Link from "next/link";

import { AvatarUpload } from "@/components/account/avatar-upload";
import { NotificationPrefs } from "@/components/account/notification-prefs";
import { LegalLinks } from "@/components/legal/legal-links";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { loadAccountState, loadOrganizationName } from "@/lib/account/data";
import { signOut } from "@/lib/auth/actions";
import { ROLE_HELP, roleChromeLabel, type AppRole } from "@/lib/auth/roles";
import { loadManagerGroups } from "@/lib/manager/data";
import { cn } from "@/lib/utils";

export async function AccountView({
  role,
  userId,
  email,
  error,
  notice,
}: {
  role: AppRole;
  userId: string;
  email?: string | null;
  error?: string;
  notice?: string;
}) {
  const [account, organizationName, managedOrgs] = await Promise.all([
    loadAccountState(userId),
    role === "father" ? loadOrganizationName(userId) : Promise.resolve(null),
    role === "manager" ? loadManagerGroups(userId) : Promise.resolve([]),
  ]);
  const identityLabel = roleChromeLabel(role, organizationName);
  const managedNames = managedOrgs
    .map((organization) => organization.name.trim())
    .filter(Boolean);
  const photosLabel =
    managedNames.length === 1
      ? `Photos ${managedNames[0]} participants see on Home and Trainings.`
      : managedNames.length > 1
        ? `Photos ${managedNames.join(" and ")} participants see on Home and Trainings.`
        : "Photos your organization sees on Home and Trainings.";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === "manager"
            ? "Your photo, organization photos, notifications, and sign out."
            : "Photo, notifications, and sign out."}
        </p>
      </div>
      <Flash error={error} notice={notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <AvatarUpload name={account.fullName} email={email} avatarUrl={account.avatarUrl} />
      </section>

      {role === "manager" ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Organization Photos</h2>
          <p className="mt-1 text-sm text-muted-foreground">{photosLabel}</p>
          <Link
            href="/manager/account/photos"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            Manage photos
          </Link>
        </section>
      ) : null}

      {identityLabel ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Role</h2>
          <p className="mt-3 text-base font-medium">{identityLabel}</p>
        </section>
      ) : null}

      <NotificationPrefs role={role} initial={account.preferences} />

      {role === "admin" ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Support Inbox</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reports from fathers, managers, and reviewers.
          </p>
          <Link
            href="/admin/support"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            Open inbox
          </Link>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Help</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Something not working, or a question? Send a short note. We read every
            report.
          </p>
          <Link
            href={ROLE_HELP[role]}
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            Report a Problem
          </Link>
        </section>
      )}

      <form action={signOut}>
        <Button type="submit" variant="destructive" className="w-full sm:w-auto">
          Sign Out
        </Button>
      </form>

      <LegalLinks helpHref={role === "admin" ? undefined : ROLE_HELP[role]} />
    </div>
  );
}
