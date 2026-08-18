import Link from "next/link";

import { PasswordField } from "@/components/auth/password-field";
import { Flash } from "@/components/manager/flash";
import { signUp } from "@/lib/auth/actions";
import { safeInternalPath } from "@/lib/auth/roles";
import { getI18n } from "@/lib/i18n/server";
import { authFieldClassName, interactiveUnderlineClassName } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: nextParam } = await searchParams;
  const next = safeInternalPath(nextParam);
  const { t } = await getI18n();
  const inviteInvalid = Boolean(error && /invite/i.test(error));
  const accountInvalid = Boolean(error && !inviteInvalid && !/too many/i.test(error));

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-medium">{t("auth.createAccount")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={signUp} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("auth.inviteCode")}</span>
            <input
              className={authFieldClassName}
              type="text"
              name="invite_code"
              autoComplete="off"
              required
              aria-invalid={inviteInvalid || undefined}
            />
            <span className="block text-xs text-muted-foreground">
              {t("auth.inviteHint")}
            </span>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("auth.email")}</span>
            <input
              className={authFieldClassName}
              type="text"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              aria-invalid={accountInvalid || undefined}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("auth.password")}</span>
            <PasswordField
              autoComplete="new-password"
              invalid={accountInvalid}
              minLength={6}
            />
          </label>
          <Flash error={error} />
          <Button type="submit" size="lg" className="w-full rounded-full">
            {t("auth.createAccountCta")}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className={interactiveUnderlineClassName}
          >
            {t("auth.signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
