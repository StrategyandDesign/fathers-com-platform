import { redirect } from "next/navigation";

import { loadOnboardingState } from "@/lib/father/onboarding-data";
import {
  isAssignedSessionPath,
  isFatherStartPath,
  onboardingHref,
} from "@/lib/father/onboarding";

export async function gateFatherOnboarding(fatherId: string, pathname: string) {
  if (!pathname || isFatherStartPath(pathname)) return;

  const state = await loadOnboardingState(fatherId);
  if (state.mode === "done" || state.step === "done") return;

  if (
    (state.step === "session" || state.step === "complete") &&
    isAssignedSessionPath(pathname, state.firstSessionId)
  ) {
    return;
  }

  if (state.step === "session" && state.firstSessionHref) {
    redirect(state.firstSessionHref);
  }

  redirect(onboardingHref(state.step));
}
