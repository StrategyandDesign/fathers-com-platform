"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { savePalettePreference } from "@/lib/theme/actions";
import {
  applyPaletteClass,
  clientPaletteCookie,
  DEFAULT_PALETTE,
  PALETTE_STORAGE_KEY,
  parsePalette,
  type Palette,
} from "@/lib/theme/palette";

type ThemeContextValue = {
  palette: Palette;
  setPalette: (palette: Palette) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  palette: DEFAULT_PALETTE,
  setPalette: () => {},
});

function persistClient(palette: Palette) {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  } catch {
    // Private mode can block storage; the cookie and class still apply.
  }
  document.cookie = clientPaletteCookie(palette);
  applyPaletteClass(document.documentElement, palette);
}

export function ThemeProvider({
  initialPalette = DEFAULT_PALETTE,
  children,
}: {
  initialPalette?: Palette;
  children: ReactNode;
}) {
  const [palette, setPaletteState] = useState<Palette>(
    parsePalette(initialPalette) ?? DEFAULT_PALETTE
  );

  useEffect(() => {
    persistClient(palette);
  }, [palette]);

  const setPalette = useCallback((next: Palette) => {
    const resolved = parsePalette(next) ?? DEFAULT_PALETTE;
    setPaletteState(resolved);
    persistClient(resolved);
    void savePalettePreference(resolved);
  }, []);

  const value = useMemo(() => ({ palette, setPalette }), [palette, setPalette]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
