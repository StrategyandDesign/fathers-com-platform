import { StartPrimaryButton, StartScreen } from "@/components/father/start-screen";
import { getI18n } from "@/lib/i18n/server";
import { beginOnboarding } from "@/lib/father/start-actions";
import { requireStartPage } from "@/lib/father/start-page";

export default async function FatherStartWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { state } = await requireStartPage("welcome");
  const { t } = await getI18n();
  const title = state.groupName
    ? t("father.start.welcomeTitle", { group: state.groupName })
    : t("father.start.welcomeTitlePlain");

  return (
    <StartScreen title={title} body={t("father.start.welcomeBody")} error={error}>
      <form action={beginOnboarding}>
        <StartPrimaryButton>{t("father.start.getStarted")}</StartPrimaryButton>
      </form>
    </StartScreen>
  );
}
