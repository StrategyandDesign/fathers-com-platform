import { saveDisplayName } from "@/lib/account/actions";
import { DISPLAY_NAME_MAX } from "@/lib/account/display-name";
import { getI18n } from "@/lib/i18n/server";
import { fieldClassName } from "@/lib/ui";
import { Button } from "@/components/ui/button";

export async function DisplayNameForm({ savedName }: { savedName: string }) {
  const { t } = await getI18n();

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="font-heading text-lg font-semibold">{t("account.displayNameTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("account.displayNameLead")}</p>
      <form action={saveDisplayName} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 space-y-2">
          <span className="text-sm text-muted-foreground">{t("account.displayNameLabel")}</span>
          <input
            className={fieldClassName}
            name="full_name"
            type="text"
            autoComplete="name"
            defaultValue={savedName}
            maxLength={DISPLAY_NAME_MAX}
            required
          />
        </label>
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          {t("account.displayNameSave")}
        </Button>
      </form>
    </section>
  );
}
