import Link from "next/link";

import { signIn } from "@/lib/auth/actions";
import { safeInternalPath } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const fieldClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeInternalPath(params.next);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Email and password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signIn} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              className={fieldClassName}
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Password</span>
            <input
              className={fieldClassName}
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          {params.error ? (
            <p className="text-sm text-destructive">{params.error}</p>
          ) : null}
          {params.notice ? (
            <p className="text-sm text-muted-foreground">{params.notice}</p>
          ) : null}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
