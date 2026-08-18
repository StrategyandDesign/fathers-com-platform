import { getI18n } from "@/lib/i18n/server";

export default async function FatherLoading() {
  const { t } = await getI18n();

  return (
    <p className="text-sm text-muted-foreground" role="status">
      {t("common.loading")}
    </p>
  );
}
