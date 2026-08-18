import { redirect } from "next/navigation";

import { loadOnboardingState } from "@/lib/father/onboarding-data";
import {
  isAssignedSessionPath,
  isFatherStartPath,
  isOnboardingActive,
  onboardingHref,
} from "@/lib/father/onboarding";

export async function gateFatherOnboarding(fatherId: string, pathname: string) {
  const state = await loadOnboardingState(fatherId);
  const active = isOnboardingActive(state.mode, state.step);

  if (!pathname || isFatherStartPath(pathname) || !active) {
    return { active };
  }

  if (
    (state.step === "session" || state.step === "complete") &&
    isAssignedSessionPath(pathname, state.firstSessionId)
  ) {
    return { active };
  }

  if (state.step === "session" && state.firstSessionHref) {
    redirect(state.firstSessionHref);
  }

  redirect(onboardingHref(state.step));
}
