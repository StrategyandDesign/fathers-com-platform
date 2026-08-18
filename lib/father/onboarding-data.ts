import { cache } from "react";

import { loadFatherOrganizationMark } from "@/lib/org-photos/data";
import { loadFirstAssignedSession, hasCompletedSession } from "@/lib/father/first-assigned";
import { isSessionComplete } from "@/lib/father/types";
import {
  currentOnboardingStep,
  isOnboardingStep,
  parseRemindAt,
  parseSetupAnswers,
  parseWeekday,
  resolveOnboardingMode,
  type OnboardingStep,
  type ReminderPreference,
  type SetupAnswers,
} from "@/lib/father/onboarding";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = {
  step: OnboardingStep;
  mode: ReturnType<typeof resolveOnboardingMode>;
  completedAt: string | null;
  answers: SetupAnswers;
  reminder: ReminderPreference | null;
  firstSessionId: string | null;
  firstSessionHref: string | null;
  groupName: string | null;
  hasAssignedSession: boolean;
};

type ProfileOnboardingRow = {
  onboarding_step?: string | null;
  onboarding_completed_at?: string | null;
  setup_answers?: unknown;
};

export const loadOnboardingState = cache(async (fatherId: string): Promise<OnboardingState> => {
  const supabase = await createClient();
  const [profileRes, reminderRes, completed, first, organization] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_step, onboarding_completed_at, setup_answers")
      .eq("id", fatherId)
      .maybeSingle(),
    supabase
      .from("reminder_preferences")
      .select("weekday, remind_at")
      .eq("father_id", fatherId)
      .maybeSingle(),
    hasCompletedSession(fatherId),
    loadFirstAssignedSession(fatherId),
    loadFatherOrganizationMark(fatherId),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (reminderRes.error) throw reminderRes.error;

  const profile = (profileRes.data ?? {}) as ProfileOnboardingRow;
  const answers = parseSetupAnswers(profile.setup_answers);
  const reminderRow = reminderRes.data as { weekday?: number; remind_at?: string } | null;
  const weekday = parseWeekday(reminderRow?.weekday);
  const remindAt = parseRemindAt(
    typeof reminderRow?.remind_at === "string" ? reminderRow.remind_at.slice(0, 5) : reminderRow?.remind_at
  );
  const reminder =
    weekday != null && remindAt ? { weekday, remindAt } : null;
  const completedAt = profile.onboarding_completed_at ?? null;
  const mode = resolveOnboardingMode({
    completedAt,
    hasCompletedSession: completed,
    hasReminder: Boolean(reminder),
  });
  const hasAssignedSession = Boolean(first);
  const storedStep = isOnboardingStep(profile.onboarding_step) ? profile.onboarding_step : null;
  const step = currentOnboardingStep({
    mode,
    storedStep,
    hasReminder: Boolean(reminder),
    hasAssignedSession,
    firstSessionComplete: isSessionComplete(first?.progress ?? null),
  });

  return {
    step,
    mode,
    completedAt,
    answers,
    reminder,
    firstSessionId: first?.session.id ?? answers.first_session_id ?? null,
    firstSessionHref: first?.href ?? null,
    groupName: organization?.name?.trim() || null,
    hasAssignedSession,
  };
});
