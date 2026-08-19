import Link from "next/link";

import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const WHITE_LOCKUP = "/brand/fathers-com-logo-white.png";
const SAGE_LOCKUP = "/brand/fathers-com-logo-sage.png";

export function BrandMark({
  className,
  alt = "",
  tone = "auto",
}: {
  className?: string;
  alt?: string;
  tone?: "header" | "auto";
}) {
  if (tone === "header") {
    return (
      // Local public lockup; plain img matches avatar usage and needs no next/image config.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={WHITE_LOCKUP} alt={alt} className={cn("h-7 w-auto", className)} />
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WHITE_LOCKUP}
        alt={alt}
        className={cn("hidden h-7 w-auto dark:inline", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SAGE_LOCKUP}
        alt={alt}
        className={cn("inline h-7 w-auto dark:hidden", className)}
      />
    </>
  );
}

export function BrandLogo({
  href = "/",
  className,
  size = "header",
  tone = "auto",
}: {
  href?: string | null;
  className?: string;
  tone?: "header" | "auto" | "foreground" | "brand";
  size?: "header" | "display";
}) {
  const lockupTone = tone === "header" ? "header" : "auto";
  const mark = (
    <BrandMark
      alt="Fathers.com"
      tone={lockupTone}
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
