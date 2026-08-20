import Link from "next/link";

import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const BRAND_LOCKUP_SRC = "/brand/fathers-com-logo-white.png";

export function BrandMark({
  className,
  alt = "",
  tone = "white",
}: {
  className?: string;
  alt?: string;
  tone?: "white" | "forest";
}) {
  if (tone === "forest") {
    return (
      <span
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={cn("inline-block aspect-[1024/197] h-7 bg-[#326638]", className)}
        style={{
          WebkitMaskImage: `url(${BRAND_LOCKUP_SRC})`,
          maskImage: `url(${BRAND_LOCKUP_SRC})`,
          maskMode: "alpha",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    );
  }

  return (
    // Local public lockup; plain img matches avatar usage and needs no next/image config.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOCKUP_SRC}
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
