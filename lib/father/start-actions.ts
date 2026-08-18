"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { loadFirstAssignedSession } from "@/lib/father/first-assigned";
import { loadOnboardingState } from "@/lib/father/onboarding-data";
import {
  isSetupChildren,
  isSetupSkill,
  isSetupWhen,
  nextStepAfterAnswer,
  onboardingHref,
  parseRemindAt,
  parseSetupAnswers,
  parseWeekday,
  type OnboardingStep,
  type SetupAnswers,
} from "@/lib/father/onboarding";
import { parseTimeZone } from "@/lib/notifications/schedule";
import { createClient } from "@/lib/supabase/server";

function failStart(step: OnboardingStep, message: string): never {
  redirect(`${onboardingHref(step)}?error=${encodeURIComponent(message)}`);
}

async function writeOnboarding(
  fatherId: string,
  patch: {
    step: OnboardingStep;
    answers?: SetupAnswers;
    completedAt?: string | null;
  }
) {
  const supabase = await createClient();
  const { data: current, error: loadError } = await supabase
    .from("profiles")
    .select("setup_answers")
    .eq("id", fatherId)
    .maybeSingle();
  if (loadError) throw loadError;

  const answers = {
    ...parseSetupAnswers(current?.setup_answers),
    ...(patch.answers ?? {}),
  };

  const payload: Record<string, unknown> = {
    onboarding_step: patch.step,
    setup_answers: answers,
  };
  if (patch.completedAt !== undefined) {
    payload.onboarding_completed_at = patch.completedAt;
  }

  const { error } = await supabase.from("profiles").update(payload).eq("id", fatherId);
  if (error) throw error;
  revalidatePath("/father");
  revalidatePath("/father/start");
}

export async function beginOnboarding() {
  const { user } = await requireRole("father");
  const state = await loadOnboardingState(user.id);
  if (state.mode === "done") redirect("/father");
  if (state.mode === "reminder-only") redirect("/father/start/reminder");
  if (state.step !== "welcome") redirect(onboardingHref(state.step));
  try {
    await writeOnboarding(user.id, { step: "children", answers: state.answers });
  } catch {
    failStart("welcome", "That step didn’t save. Try again.");
  }
  redirect("/father/start/children");
}

export async function saveSetupAnswer(formData: FormData) {
  const { user } = await requireRole("father");
  const question = String(formData.get("question") ?? "");
  const answer = String(formData.get("answer") ?? "");
  const state = await loadOnboardingState(user.id);

  if (state.mode !== "full") {
    redirect(onboardingHref(state.step));
  }
  if (
    question !== "children" &&
    question !== "skill" &&
    question !== "when"
  ) {
    failStart(state.step, "Choose one of the listed options.");
  }
  if (state.step !== question) {
    redirect(onboardingHref(state.step));
  }

  const answers: SetupAnswers = { ...state.answers };
  if (question === "children" && isSetupChildren(answer)) {
    answers.children = answer;
  } else if (question === "skill" && isSetupSkill(answer)) {
    answers.skill = answer;
  } else if (question === "when" && isSetupWhen(answer)) {
    answers.when = answer;
  } else {
    failStart(question, "Choose one of the listed options.");
  }

  const next = nextStepAfterAnswer(question);

  try {
    await writeOnboarding(user.id, { step: next, answers });
  } catch {
    failStart(question, "That step didn’t save. Try again.");
  }
  redirect(onboardingHref(next));
}

export async function saveOnboardingReminder(formData: FormData) {
  const { user } = await requireRole("father");
  const weekday = parseWeekday(formData.get("weekday"));
  const remindAt = parseRemindAt(formData.get("remind_at"));
  const timezone = parseTimeZone(formData.get("timezone"));
  if (weekday == null || !remindAt) {
    failStart("reminder", "Pick a day and a time.");
  }

  const state = await loadOnboardingState(user.id);
  if (state.mode === "done") redirect("/father");
  if (state.step !== "reminder") redirect(onboardingHref(state.step));

  const supabase = await createClient();
  const { error } = await supabase.from("reminder_preferences").upsert(
    {
      father_id: user.id,
      weekday,
      remind_at: `${remindAt}:00`,
    },
    { onConflict: "father_id" }
  );
  if (error) failStart("reminder", "That reminder didn’t save. Try again.");

  await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    reminder_day: weekday,
    reminder_time: `${remindAt}:00`,
    timezone: timezone ?? "UTC",
    updated_at: new Date().toISOString(),
  });

  if (state.mode === "reminder-only") {
    try {
      await writeOnboarding(user.id, {
        step: "done",
        answers: state.answers,
        completedAt: new Date().toISOString(),
      });
    } catch {
      failStart("reminder", "That reminder didn’t save. Try again.");
    }
    redirect("/father");
  }

  const first = await loadFirstAssignedSession(user.id);
  const next: OnboardingStep = first ? "session" : "hold";
  try {
    await writeOnboarding(user.id, {
      step: next,
      answers: {
        ...state.answers,
        first_session_id: first?.session.id,
      },
    });
  } catch {
    failStart("reminder", "That reminder didn’t save. Try again.");
  }
  redirect(first ? first.href : "/father/start/hold");
}

export async function advanceOnboardingAfterSession(fatherId: string, sessionId: string) {
  const state = await loadOnboardingState(fatherId);
  if (state.mode !== "full" || state.completedAt) return null;
  const first = await loadFirstAssignedSession(fatherId);
  if (!first || first.session.id !== sessionId) return null;
  await writeOnboarding(fatherId, { step: "complete", answers: state.answers });
  return "/father/start/complete";
}

export async function finishOnboarding() {
  const { user } = await requireRole("father");
  const state = await loadOnboardingState(user.id);
  if (state.mode === "done" || state.step === "done") redirect("/father");
  if (state.step !== "complete") redirect(onboardingHref(state.step));
  try {
    await writeOnboarding(user.id, {
      step: "done",
      answers: state.answers,
      completedAt: state.completedAt ?? new Date().toISOString(),
    });
  } catch {
    failStart("complete", "That step didn’t save. Try again.");
  }
  redirect("/father");
}
