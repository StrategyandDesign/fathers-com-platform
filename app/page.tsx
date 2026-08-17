import Link from "next/link";

import { BrandLogo } from "@/components/brand/logo";
import { LegalLinks } from "@/components/legal/legal-links";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-8 px-4 py-5 sm:px-5 sm:py-10 md:px-6 md:py-16 lg:px-8">
      <div>
        <BrandLogo href={null} size="display" />
        <h1 className="sr-only">Fathers.com</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Three roles: Father Participant, Manager, and Reviewer.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
          Sign in
        </Link>
        <Link
          href="/signup"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
        >
          Create account
        </Link>
      </div>
      <LegalLinks />
    </main>
  );
}
