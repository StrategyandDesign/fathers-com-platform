import { StartPrimaryButton, StartScreen } from "@/components/father/start-screen";
import { getI18n } from "@/lib/i18n/server";
import { finishManagerOnboarding } from "@/lib/manager/start-actions";

export default async function ManagerStartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { t } = await getI18n();

  return (
    <StartScreen title={t("manager.start.title")} body={t("manager.start.body")} error={error}>
      <ol className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <li>{t("manager.start.stepInclude")}</li>
        <li>{t("manager.start.stepAssign")}</li>
        <li>{t("manager.start.stepInvite")}</li>
        <li>{t("manager.start.stepPhotos")}</li>
      </ol>
      <form action={finishManagerOnboarding}>
        <StartPrimaryButton>{t("manager.start.openDesk")}</StartPrimaryButton>
      </form>
    </StartScreen>
  );
}
