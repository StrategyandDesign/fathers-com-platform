import { saveLocalePreference } from "@/lib/i18n/actions";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { fieldClassName } from "@/lib/ui";
import { Button } from "@/components/ui/button";

export async function LanguageForm({
  savedLocale,
}: {
  savedLocale: string | null;
}) {
  const { t } = await getI18n();
  const current = savedLocale ?? "";

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="font-heading text-lg font-semibold">{t("account.languageTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("account.languageLead")}</p>
      <form action={saveLocalePreference} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 space-y-2">
          <span className="text-sm text-muted-foreground">{t("common.language")}</span>
          <select className={fieldClassName} name="locale" defaultValue={current}>
            <option value="">{t("common.organizationDefault")}</option>
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {LOCALE_META[locale as Locale].nativeLabel}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          {t("account.languageSave")}
        </Button>
      </form>
    </section>
  );
}
