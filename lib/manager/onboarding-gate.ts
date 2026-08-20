import { redirect } from "next/navigation";

import { loadManagerOnboardedAt } from "@/lib/manager/onboarding-data";
import {
  isManagerStartPath,
  managerOnboardingHref,
  shouldShowManagerOnboarding,
} from "@/lib/manager/onboarding";

export async function gateManagerOnboarding(managerId: string, pathname: string) {
  const onboardedAt = await loadManagerOnboardedAt(managerId);
  const active = shouldShowManagerOnboarding(onboardedAt);

  if (!pathname) return { active };
  if (isManagerStartPath(pathname)) {
    if (!active) redirect("/manager");
    return { active };
  }
  if (active) redirect(managerOnboardingHref());
  return { active };
}
