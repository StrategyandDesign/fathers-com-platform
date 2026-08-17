import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-5 text-center sm:px-5 md:px-6 md:py-16 lg:px-8">
      <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        Fathers.com
      </p>
      <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight">
        This page isn’t available
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It may have been moved, or you may not have access. Go back to your home
        screen.
      </p>
      <Link
        href="/"
        className={cn(buttonVariants(), "mt-6 w-full sm:w-auto sm:self-center")}
      >
        Go home
      </Link>
    </main>
  );
}
