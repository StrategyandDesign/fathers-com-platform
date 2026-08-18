import { StartReminderForm } from "@/components/father/start-reminder-form";
import { StartScreen } from "@/components/father/start-screen";
import { defaultRemindAt } from "@/lib/father/onboarding";
import { requireStartPage } from "@/lib/father/start-page";
import { getI18n } from "@/lib/i18n/server";

export default async function FatherStartReminderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { state } = await requireStartPage("reminder");
  const { t } = await getI18n();
  const weekday = state.reminder?.weekday ?? null;
  const remindAt = state.reminder?.remindAt ?? defaultRemindAt(state.answers.when);

  return (
    <StartScreen
      title={t("father.start.reminderTitle")}
      body={t("father.start.reminderBody")}
      error={error}
    >
      <StartReminderForm
        weekday={weekday}
        remindAt={remindAt}
        weekdayLabels={[
          t("father.start.daySun"),
          t("father.start.dayMon"),
          t("father.start.dayTue"),
          t("father.start.dayWed"),
          t("father.start.dayThu"),
          t("father.start.dayFri"),
          t("father.start.daySat"),
        ]}
        timeLabel={t("father.start.reminderTime")}
        submitLabel={t("father.start.setReminder")}
      />
    </StartScreen>
  );
}
