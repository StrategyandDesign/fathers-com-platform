import type { SVGProps } from "react";

/**
 * Chevron stack from the Fathers.com mark (no shield, no wordmark).
 * Centerlines traced from public/brand/fathers-com-logo-white.png.
 */
export function BrandLogoArrow({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
      className={className}
      // Official mark weight; ignore Lucide nav strokeWidth.
      strokeWidth={undefined}
    >
      <path
        d="M12.39 4.09 21.58 2.23 19.82 11.1M4.8 11.36 14.36 9.94 12.69 19.5M2.42 16.18 8.81 15.54 7.84 21.77"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
