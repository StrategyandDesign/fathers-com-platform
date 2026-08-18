import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { sessionCtaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function SessionContinueLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <div className="flex justify-center max-lg:block">
      <Link
        href={href}
        className={cn(buttonVariants({ variant: "inverse", size: "lg" }), sessionCtaClassName)}
      >
        {label}
      </Link>
    </div>
  );
}
