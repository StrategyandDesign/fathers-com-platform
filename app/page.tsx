import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Pilot</p>
        <h1 className="font-heading text-3xl font-medium tracking-tight">
          Fathers.com
        </h1>
        <p className="text-muted-foreground">
          Three roles: Father Participant, Manager, and Reviewer.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/login" className={cn(buttonVariants())}>
          Sign in
        </Link>
        <Link
          href="/signup"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
