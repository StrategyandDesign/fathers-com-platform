import type { Metadata, Viewport } from "next";
import { Geist_Mono, Heebo, Inter } from "next/font/google";

import { LocaleProvider } from "@/components/i18n/locale-provider";
import { localeDir } from "@/lib/i18n/config";
import { readLocaleCookie } from "@/lib/i18n/cookie";

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

export const metadata: Metadata = {
  title: "Fathers.com",
  description: "Fathers.com pilot",
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
  const locale = await readLocaleCookie();
  const dir = localeDir(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`dark ${inter.variable} ${heebo.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
