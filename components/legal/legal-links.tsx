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
  copyright = false,
}: {
  className?: string;
  align?: "start" | "center";
  copyright?: boolean;
}) {
  const nav = (
    <nav
      aria-label="Legal"
      className={cn(
        "flex flex-wrap items-center gap-x-3",
        align === "center" && "justify-center",
        !copyright && className
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

  if (!copyright) {
    return nav;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {nav}
      <p className="text-xs text-muted-foreground">© 2026 Fathers.com</p>
    </div>
  );
}
