import { saveDisplayTitle } from "@/lib/account/actions";
import {
  MANAGER_DISPLAY_TITLES,
  type ManagerDisplayTitle,
} from "@/lib/account/display-title";
import { getI18n } from "@/lib/i18n/server";
import { radioOptionClassName } from "@/lib/ui";
import { Button } from "@/components/ui/button";

export async function DisplayTitleForm({
  savedTitle,
}: {
  savedTitle: ManagerDisplayTitle;
}) {
  const { t } = await getI18n();

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="font-heading text-lg font-semibold">{t("account.displayTitleTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("account.displayTitleLead")}</p>
      <form action={saveDisplayTitle} className="mt-5 space-y-3">
        {MANAGER_DISPLAY_TITLES.map((title) => (
          <label key={title} className={radioOptionClassName}>
            <input
              type="radio"
              name="display_title"
              value={title}
              defaultChecked={savedTitle === title}
              required
              className="size-4 accent-primary"
            />
            <span>
              <span className="block font-medium">{t(`role.${title}`)}</span>
              <span className="block text-sm text-muted-foreground">
                {title === "leader"
                  ? t("account.displayTitleLeaderHint")
                  : t("account.displayTitleManagerHint")}
              </span>
            </span>
          </label>
        ))}
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          {t("account.displayTitleSave")}
        </Button>
      </form>
    </section>
  );
}
