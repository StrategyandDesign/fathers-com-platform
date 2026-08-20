import type { SVGProps } from "react";

/**
 * Official Fathers.com chevron stack (no shield, no wordmark).
 * Filled so the mark follows currentColor: light on dark, dark on light.
 */
export function BrandLogoArrow({
  className,
  strokeWidth: _strokeWidth,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      {...props}
      className={className}
    >
      <g transform="rotate(-45 12 12)">
        <path d="M1.6 5.1 8.7 12 1.6 18.9h3.3L11.9 12 4.9 5.1H1.6Z" />
        <path d="M6.7 5.1 13.8 12 6.7 18.9h3.3L17 12 10 5.1H6.7Z" />
        <path d="M11.8 5.1 18.9 12 11.8 18.9h3.3L22.1 12 15.1 5.1h-3.3Z" />
      </g>
    </svg>
  );
}
