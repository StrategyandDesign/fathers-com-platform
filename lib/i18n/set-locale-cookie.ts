"use server";

import { revalidatePath } from "next/cache";

import { isLocale, type Locale } from "@/lib/i18n/config";
import { writeLocaleCookie } from "@/lib/i18n/cookie";

export async function setLocaleCookie(locale: Locale) {
  if (!isLocale(locale)) return;
  await writeLocaleCookie(locale);
  revalidatePath("/", "layout");
}
