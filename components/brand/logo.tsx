import Link from "next/link";

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
      className="inline-flex rounded-md outline-none transition-opacity duration-150 ease-out hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {mark}
    </Link>
  );
}
