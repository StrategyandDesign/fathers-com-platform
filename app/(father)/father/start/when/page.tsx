import { StartChoiceForm } from "@/components/father/start-choice-form";
import { StartScreen } from "@/components/father/start-screen";
import { getI18n } from "@/lib/i18n/server";
import { requireStartPage } from "@/lib/father/start-page";

export default async function FatherStartWhenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { state } = await requireStartPage("when");
  const { t } = await getI18n();

  return (
    <StartScreen title={t("father.start.when")} error={error}>
      <StartChoiceForm
        question="when"
        selected={state.answers.when}
        options={[
          { value: "early_morning", label: t("father.start.whenMorning") },
          { value: "lunch", label: t("father.start.whenLunch") },
          { value: "evening", label: t("father.start.whenEvening") },
          { value: "late_night", label: t("father.start.whenNight") },
        ]}
      />
    </StartScreen>
  );
}
