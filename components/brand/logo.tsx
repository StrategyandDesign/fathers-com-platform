import Link from "next/link";

import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const WHITE_LOCKUP = "/brand/fathers-com-logo-white.png";

export function BrandMark({
  className,
  alt = "",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    // Local public lockup; plain img matches avatar usage and needs no next/image config.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={WHITE_LOCKUP}
      alt={alt}
      className={cn("h-7 w-auto", className)}
    />
  );
}

export function BrandLogo({
  href = "/",
  className,
  size = "header",
}: {
  href?: string | null;
  className?: string;
  tone?: "foreground" | "brand";
  size?: "header" | "display";
}) {
  const mark = (
    <BrandMark
      alt="Fathers.com"
      className={cn(size === "display" ? "h-10" : "h-7", className)}
    />
  );

  if (!href) {
    return mark;
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex rounded-md hover:opacity-80",
        interactiveControlClassName
      )}
    >
      {mark}
    </Link>
  );
}
