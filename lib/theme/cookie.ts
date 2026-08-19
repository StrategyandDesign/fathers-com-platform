import { cookies } from "next/headers";

import {
  DEFAULT_PALETTE,
  PALETTE_COOKIE,
  paletteCookieOptions,
  parsePalette,
  type Palette,
} from "@/lib/theme/palette";

export async function peekPaletteCookie(): Promise<Palette | null> {
  const jar = await cookies();
  return parsePalette(jar.get(PALETTE_COOKIE)?.value);
}

export async function readPaletteCookie(): Promise<Palette> {
  return (await peekPaletteCookie()) ?? DEFAULT_PALETTE;
}

export async function writePaletteCookie(palette: Palette) {
  const jar = await cookies();
  jar.set(PALETTE_COOKIE, palette, paletteCookieOptions());
}
