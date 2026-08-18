import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { loadOnboardingState, type OnboardingState } from "@/lib/father/onboarding-data";
import {
  canOpenOnboardingStep,
  onboardingHref,
  type OnboardingStep,
} from "@/lib/father/onboarding";

export async function requireStartPage(requested: OnboardingStep): Promise<{
  state: OnboardingState;
}> {
  const { user } = await requireRole("father");
  const state = await loadOnboardingState(user.id);

  if (state.completedAt || state.step === "done") {
    redirect("/father");
  }

  if (!canOpenOnboardingStep(requested, state.step)) {
    redirect(onboardingHref(state.step));
  }

  return { state };
}
