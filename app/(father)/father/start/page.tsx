import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { loadOnboardingState } from "@/lib/father/onboarding-data";
import { onboardingHref } from "@/lib/father/onboarding";

export default async function FatherStartIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { user } = await requireRole("father");
  const state = await loadOnboardingState(user.id);
  if (state.mode === "done" || state.step === "done") {
    redirect("/father");
  }
  if (state.step === "session" && state.firstSessionHref) {
    redirect(state.firstSessionHref);
  }
  const href = onboardingHref(state.step);
  if (error) {
    redirect(`${href}?error=${encodeURIComponent(error)}`);
  }
  redirect(href);
}
