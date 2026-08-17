import Link from "next/link";

import { interactiveUnderlineClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const linkClassName = cn(
  "inline-flex min-h-11 items-center text-sm",
  interactiveUnderlineClassName
);

export function LegalLinks({
  className,
  align = "start",
}: {
  className?: string;
  align?: "start" | "center";
}) {
  return (
    <nav
      aria-label="Legal"
      className={cn(
        "flex flex-wrap items-center gap-x-3",
        align === "center" && "justify-center",
        className
      )}
    >
      <Link href="/privacy" className={linkClassName}>
        Privacy
      </Link>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <Link href="/terms" className={linkClassName}>
        Terms
      </Link>
    </nav>
  );
}
