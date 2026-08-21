import { cn } from "@/lib/utils";

export function SceneArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 280"
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <rect width="640" height="280" fill="#101510" />
      <path d="M0 168 90 128 170 158 280 96 390 150 480 110 640 168v112H0Z" fill="#1d3322" />
      <path d="M0 198 120 168 220 190 340 150 470 186 640 160v120H0Z" fill="#24402a" />
      <ellipse cx="320" cy="214" rx="210" ry="22" fill="#1a2c28" />
      <ellipse cx="320" cy="214" rx="150" ry="14" fill="#2d4a40" opacity=".55" />
      <circle cx="92" cy="86" r="28" fill="#3d5a3a" />
      <path d="M68 168h48L92 92Z" fill="#2a4a30" />
      <path d="M148 176h36L166 118Z" fill="#325636" />
      <path d="M508 180h56L536 108Z" fill="#2f5234" />
      <path d="M568 186h40L588 128Z" fill="#27462c" />
      <circle cx="236" cy="176" r="11" fill="#c4b59a" />
      <rect x="230" y="186" width="12" height="22" rx="2" fill="#3a5c40" />
      <circle cx="268" cy="180" r="8" fill="#d7c4a8" />
      <rect x="263" y="187" width="10" height="16" rx="2" fill="#4a6741" />
    </svg>
  );
}
