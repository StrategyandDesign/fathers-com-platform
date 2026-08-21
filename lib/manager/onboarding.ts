export function isManagerStartPath(pathname: string) {
  return pathname === "/manager/start" || pathname.startsWith("/manager/start/");
}

export function managerOnboardingHref() {
  return "/manager/start";
}

export function shouldShowManagerOnboarding(onboardedAt?: string | null) {
  return !onboardedAt;
}
