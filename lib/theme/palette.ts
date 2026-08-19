export const PALETTES = ["dark", "light"] as const;

export type Palette = (typeof PALETTES)[number];

export const DEFAULT_PALETTE: Palette = "dark";

export const PALETTE_COOKIE = "fc_palette";
export const PALETTE_STORAGE_KEY = "fc_palette";

export function paletteCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };
}

export function isPalette(value: unknown): value is Palette {
  return value === "dark" || value === "light";
}

export function parsePalette(value: unknown): Palette | null {
  return isPalette(value) ? value : null;
}

/** Saved choice wins. System preference is only a fallback before any choice. Default is dark. */
export function resolvePalette(
  saved: unknown,
  system?: Palette | null
): Palette {
  const explicit = parsePalette(saved);
  if (explicit) return explicit;
  if (system === "light" || system === "dark") return system;
  return DEFAULT_PALETTE;
}

export function paletteClassName(palette: Palette) {
  return palette === "light" ? "light" : "dark";
}

export function applyPaletteClass(root: HTMLElement, palette: Palette) {
  root.classList.remove("light", "dark");
  root.classList.add(paletteClassName(palette));
  root.style.colorScheme = palette;
  root.dataset.palette = palette;
}

export function clientPaletteCookie(palette: Palette) {
  const maxAge = 60 * 60 * 24 * 365;
  return `${PALETTE_COOKIE}=${palette}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
