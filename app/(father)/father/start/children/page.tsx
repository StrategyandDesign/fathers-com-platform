import { StartChoiceForm } from "@/components/father/start-choice-form";
import { StartScreen } from "@/components/father/start-screen";
import { getI18n } from "@/lib/i18n/server";
import { requireStartPage } from "@/lib/father/start-page";

export default async function FatherStartChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { state } = await requireStartPage("children");
  const { t } = await getI18n();

  return (
    <StartScreen title={t("father.start.children")} error={error}>
      <StartChoiceForm
        question="children"
        selected={state.answers.children}
        options={[
          { value: "1", label: t("father.start.children1") },
          { value: "2", label: t("father.start.children2") },
          { value: "3_plus", label: t("father.start.children3") },
          { value: "prefer_not", label: t("father.start.childrenSkip") },
        ]}
      />
    </StartScreen>
  );
}
