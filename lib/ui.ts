export const fieldClassName =
  "h-11 w-full min-w-0 max-w-full rounded-lg border border-input bg-black/40 px-3 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm";

export const authFieldClassName =
  `${fieldClassName} border-primary/40`;

export const textareaClassName =
  "min-h-28 w-full rounded-lg border border-input bg-black/40 px-3 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:min-h-24 md:py-2.5 md:text-sm";

/** One press language: 150ms ease-out, instant scale + fade. No bounce. */
export const interactiveControlClassName =
  "outline-none transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] active:opacity-90";

export const interactiveSurfaceClassName =
  `${interactiveControlClassName} hover:bg-white/5 focus-visible:bg-white/5`;

export const interactiveLinkClassName =
  `rounded-sm ${interactiveControlClassName} hover:text-foreground`;

export const interactiveUnderlineClassName =
  `rounded-sm text-foreground underline underline-offset-4 ${interactiveControlClassName} hover:text-foreground/80`;

export const interactiveIconClassName =
  `${interactiveControlClassName} hover:bg-white/5`;

export const radioOptionClassName =
  `flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-3 text-base ${interactiveControlClassName} hover:bg-white/5 has-[:checked]:border-primary/50 has-[:checked]:bg-white/5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50`;

export const checkboxOptionClassName =
  `flex min-h-11 cursor-pointer items-center gap-3 rounded-lg text-sm ${interactiveControlClassName} hover:bg-white/5 focus-within:ring-3 focus-within:ring-ring/50`;

export const sessionDotClassName =
  `flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-medium ${interactiveControlClassName}`;

export const sessionCtaClassName =
  "w-full min-h-11 max-lg:bg-primary max-lg:text-primary-foreground max-lg:hover:bg-primary/85 lg:w-auto";

/** Dominant next-action control on Father Home. Full-width, thumb-height. */
export const homePrimaryCtaClassName =
  "w-full min-h-12 text-base sm:min-h-12";

export function initials(value?: string | null) {
  const source = value?.trim() || "F";
  const parts = source.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "F") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase();
}
