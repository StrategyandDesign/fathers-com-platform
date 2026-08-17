import Link from "next/link";

import { signUp } from "@/lib/auth/actions";
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

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          New accounts start as Father Participant. A manager invite code is required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signUp} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Invite code</span>
            <input
              className={fieldClassName}
              type="text"
              name="invite_code"
              autoComplete="off"
              required
            />
          </label>
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
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
