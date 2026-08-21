import Link from "next/link";

import { PasswordField } from "@/components/auth/password-field";
import { Flash } from "@/components/manager/flash";
import { joinAsLeader } from "@/lib/auth/leader-join";
import { loadOpenManagerInvite } from "@/lib/manager/invite-data";
import { getI18n } from "@/lib/i18n/server";
import { authFieldClassName, interactiveUnderlineClassName } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LeaderJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token = "", error } = await searchParams;
  const { t } = await getI18n();
  const invite = token ? await loadOpenManagerInvite(token) : null;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-medium">{t("auth.leaderJoinTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {invite ? (
          <form action={joinAsLeader} className="space-y-5">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("auth.leaderJoinLead", { org: invite.organizationName })}
            </p>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">{t("auth.email")}</span>
              <input
                className={authFieldClassName}
                type="email"
                value={invite.email}
                readOnly
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">{t("auth.leaderJoinName")}</span>
              <input
                className={authFieldClassName}
                type="text"
                name="full_name"
                defaultValue={invite.fullName ?? ""}
                autoComplete="name"
                required
                maxLength={80}
                aria-invalid={Boolean(error && /name/i.test(error)) || undefined}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">{t("auth.password")}</span>
              <PasswordField
                autoComplete="new-password"
                invalid={Boolean(error && /password/i.test(error))}
                minLength={6}
              />
            </label>
            <Flash error={error} />
            <Button type="submit" size="lg" className="w-full rounded-full">
              {t("auth.leaderJoinCta")}
            </Button>
          </form>
        ) : (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("auth.leaderJoinClosed")}
            </p>
            <Flash error={error} />
          </div>
        )}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className={interactiveUnderlineClassName}>
            {t("auth.signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
