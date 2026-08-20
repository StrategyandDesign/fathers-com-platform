import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist_Mono, Heebo, IBM_Plex_Serif, Inter } from "next/font/google";

import { ClearStaleServiceWorkers } from "@/components/dev/clear-stale-service-workers";
import { DevLiveReload } from "@/components/dev/live-reload";
import { VersionStamp } from "@/components/dev/version-stamp";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { localeDir } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { readPaletteCookie } from "@/lib/theme/cookie";
import { paletteClassName } from "@/lib/theme/palette";
import { PALETTE_BOOT_SCRIPT } from "@/lib/theme/script";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans-family",
  subsets: ["latin"],
});

const heebo = Heebo({
  variable: "--font-hebrew-family",
  subsets: ["hebrew", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-display-family",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Fathers.com Pilot",
    template: "%s · Fathers.com Pilot",
  },
  description: "The Fathers Performance Platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getI18n();
  const dir = localeDir(locale);
  const palette = await readPaletteCookie();

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${paletteClassName(palette)} ${inter.variable} ${heebo.variable} ${geistMono.variable} ${ibmPlexSerif.variable}`}
      data-palette={palette}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <Script id="fc-palette" strategy="beforeInteractive">
          {PALETTE_BOOT_SCRIPT}
        </Script>
        <ClearStaleServiceWorkers />
        <DevLiveReload />
        <VersionStamp />
        <ThemeProvider initialPalette={palette}>
          <LocaleProvider locale={locale}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
