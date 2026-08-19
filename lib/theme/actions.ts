"use server";

import { getAuthContext } from "@/lib/auth/session";
import { writePaletteCookie } from "@/lib/theme/cookie";
import { isPalette, type Palette } from "@/lib/theme/palette";
import { createClient } from "@/lib/supabase/server";

export async function savePalettePreference(palette: Palette) {
  if (!isPalette(palette)) {
    return { error: "invalid" as const };
  }

  try {
    await writePaletteCookie(palette);
  } catch {
    // Cookie write can fail in a static render; the client cookie still holds.
  }

  const { user } = await getAuthContext();
  if (!user) {
    return { ok: true as const };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ color_scheme: palette })
    .eq("id", user.id);

  if (error) {
    return { error: "save_failed" as const };
  }

  return { ok: true as const };
}
