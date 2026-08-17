import Link from "next/link";

import { PasswordField } from "@/components/auth/password-field";
import { LocaleSwitch } from "@/components/i18n/locale-switch";
import { Flash } from "@/components/manager/flash";
import { signIn } from "@/lib/auth/actions";
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeInternalPath(params.next);
  const { t } = await getI18n();
  const credentialsInvalid =
    Boolean(params.error) && !/deactivated|too many/i.test(params.error ?? "");

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-medium">{t("auth.signIn")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={signIn} className="space-y-5">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("auth.email")}</span>
            <input
              className={authFieldClassName}
              type="text"
              name="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              aria-invalid={credentialsInvalid || undefined}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("auth.password")}</span>
            <PasswordField
              autoComplete="current-password"
              invalid={credentialsInvalid}
              defaultVisible
            />
          </label>
          <Flash error={params.error} notice={params.notice} />
          <Button type="submit" size="lg" className="w-full rounded-full">
            {t("auth.signIn")}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className={interactiveUnderlineClassName}
          >
            {t("auth.createOne")}
          </Link>
        </p>
        <LocaleSwitch className="mt-6 justify-center" compact />
      </CardContent>
    </Card>
  );
}
