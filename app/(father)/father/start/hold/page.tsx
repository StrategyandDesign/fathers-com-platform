import { redirect } from "next/navigation";

import { StartScreen } from "@/components/father/start-screen";
import { requireStartPage } from "@/lib/father/start-page";
import { getI18n } from "@/lib/i18n/server";

export default async function FatherStartHoldPage() {
  const { state } = await requireStartPage("hold");
  if (state.firstSessionHref) {
    redirect(state.firstSessionHref);
  }
  const { t } = await getI18n();

  return <StartScreen title={t("father.start.holdTitle")} body={t("father.start.holdBody")} />;
}
