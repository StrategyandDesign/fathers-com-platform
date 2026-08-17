import { AvatarUpload } from "@/components/account/avatar-upload";
import { NotificationPrefs } from "@/components/account/notification-prefs";
import { LegalLinks } from "@/components/legal/legal-links";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { loadAccountState } from "@/lib/account/data";
import { signOut } from "@/lib/auth/actions";
import { ROLE_LABEL, type AppRole } from "@/lib/auth/roles";

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
  const account = await loadAccountState(userId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Photo, notifications, and sign out.
        </p>
      </div>
      <Flash error={error} notice={notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <AvatarUpload name={account.fullName} email={email} avatarUrl={account.avatarUrl} />
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Role</h2>
        <p className="mt-3 text-base font-medium">{ROLE_LABEL[role]}</p>
      </section>

      <NotificationPrefs role={role} initial={account.preferences} />

      <form action={signOut}>
        <Button type="submit" variant="destructive" className="w-full sm:w-auto">
          Sign Out
        </Button>
      </form>

      <LegalLinks />
    </div>
  );
}
