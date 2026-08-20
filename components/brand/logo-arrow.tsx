import { cn } from "@/lib/utils";

/** Official Fathers.com Arrow mark. This is the logo file, not a redraw. */
export const BRAND_ARROW_SRC = "/brand/fathers-com-arrow.png";

export function BrandLogoArrow({
  className,
  strokeWidth: _strokeWidth,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block bg-current", className)}
      style={{
        WebkitMaskImage: `url(${BRAND_ARROW_SRC})`,
        maskImage: `url(${BRAND_ARROW_SRC})`,
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
