import { StartChoiceForm } from "@/components/father/start-choice-form";
import { StartScreen } from "@/components/father/start-screen";
import { getI18n } from "@/lib/i18n/server";
import { requireStartPage } from "@/lib/father/start-page";

export default async function FatherStartSkillPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { state } = await requireStartPage("skill");
  const { t } = await getI18n();

  return (
    <StartScreen title={t("father.start.skill")} error={error}>
      <StartChoiceForm
        question="skill"
        selected={state.answers.skill}
        options={[
          { value: "calm", label: t("father.start.skillCalm") },
          { value: "listening", label: t("father.start.skillListening") },
          { value: "consistent", label: t("father.start.skillConsistent") },
          { value: "showing_up", label: t("father.start.skillShowingUp") },
        ]}
      />
    </StartScreen>
  );
}
