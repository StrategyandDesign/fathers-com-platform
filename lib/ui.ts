export const fieldClassName =
  "h-11 w-full min-w-0 max-w-full rounded-lg border border-input bg-black/40 px-3 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm";

export const authFieldClassName =
  `${fieldClassName} border-primary/40`;

export const textareaClassName =
  "min-h-28 w-full rounded-lg border border-input bg-black/40 px-3 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:min-h-24 md:py-2.5 md:text-sm";

export const interactiveSurfaceClassName =
  "outline-none transition-colors duration-150 ease-out hover:bg-white/5 focus-visible:bg-white/5 focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-90";

export const interactiveLinkClassName =
  "rounded-sm outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-90";

export const interactiveUnderlineClassName =
  "rounded-sm text-foreground underline underline-offset-4 outline-none transition-colors duration-150 ease-out hover:text-foreground/80 focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-90";

export const interactiveIconClassName =
  "outline-none transition-colors duration-150 ease-out hover:bg-white/5 focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-90";

export const radioOptionClassName =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-3 text-base outline-none transition-colors duration-150 ease-out hover:bg-white/5 has-[:checked]:border-primary/50 has-[:checked]:bg-white/5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 active:opacity-90";

export const sessionCtaClassName =
  "w-full min-h-11 max-lg:bg-primary max-lg:text-primary-foreground max-lg:hover:bg-primary/85 lg:w-auto";

export function initials(value?: string | null) {
  const source = value?.trim() || "F";
  const parts = source.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "F") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase();
}
