import { StartPrimaryButton, StartScreen } from "@/components/father/start-screen";
import { requireStartPage } from "@/lib/father/start-page";
import { finishOnboarding } from "@/lib/father/start-actions";
import { getI18n } from "@/lib/i18n/server";

export default async function FatherStartCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireStartPage("complete");
  const { t } = await getI18n();

  return (
    <StartScreen
      title={t("father.start.completeTitle")}
      body={t("father.start.completeBody")}
      error={error}
    >
      <p className="text-sm text-muted-foreground">{t("father.start.streak")}</p>
      <form action={finishOnboarding}>
        <StartPrimaryButton>{t("father.start.continueHome")}</StartPrimaryButton>
      </form>
    </StartScreen>
  );
}
