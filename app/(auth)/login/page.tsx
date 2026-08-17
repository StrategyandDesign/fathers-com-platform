import Link from "next/link";

import { PasswordField } from "@/components/auth/password-field";
import { Flash } from "@/components/manager/flash";
import { signIn } from "@/lib/auth/actions";
import { safeInternalPath } from "@/lib/auth/roles";
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
  const credentialsInvalid =
    Boolean(params.error) && !/deactivated|too many/i.test(params.error ?? "");

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-medium">Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={signIn} className="space-y-5">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Email</span>
            <input
              className={authFieldClassName}
              type="email"
              name="email"
              autoComplete="email"
              required
              aria-invalid={credentialsInvalid || undefined}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Password</span>
            <PasswordField
              autoComplete="current-password"
              invalid={credentialsInvalid}
              defaultVisible
            />
          </label>
          <Flash error={params.error} notice={params.notice} />
          <Button type="submit" size="lg" className="w-full rounded-full">
            Sign In
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className={interactiveUnderlineClassName}
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
