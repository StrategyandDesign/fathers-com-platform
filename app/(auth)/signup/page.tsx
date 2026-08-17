import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { signUp } from "@/lib/auth/actions";
import { safeInternalPath } from "@/lib/auth/roles";
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
  const inviteInvalid = Boolean(error && /invite/i.test(error));
  const accountInvalid = Boolean(error && !inviteInvalid && !/too many/i.test(error));

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-medium">Create your account</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={signUp} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Invite code</span>
            <input
              className={authFieldClassName}
              type="text"
              name="invite_code"
              autoComplete="off"
              required
              aria-invalid={inviteInvalid || undefined}
            />
            <span className="block text-xs text-muted-foreground">
              Enter the code provided by your manager.
            </span>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Email</span>
            <input
              className={authFieldClassName}
              type="email"
              name="email"
              autoComplete="email"
              required
              aria-invalid={accountInvalid || undefined}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Password</span>
            <input
              className={authFieldClassName}
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={6}
              required
              aria-invalid={accountInvalid || undefined}
            />
          </label>
          <Flash error={error} />
          <Button type="submit" size="lg" className="w-full rounded-full">
            Create Account
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className={interactiveUnderlineClassName}
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
