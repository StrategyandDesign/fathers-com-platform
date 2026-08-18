export const ONBOARDING_STEPS = [
  "welcome",
  "children",
  "skill",
  "when",
  "reminder",
  "session",
  "hold",
  "complete",
  "done",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingMode = "full" | "reminder-only" | "done";

export const SETUP_CHILDREN = ["1", "2", "3_plus", "prefer_not"] as const;
export const SETUP_SKILLS = ["calm", "listening", "consistent", "showing_up"] as const;
export const SETUP_WHEN = ["early_morning", "lunch", "evening", "late_night"] as const;

export type SetupChildren = (typeof SETUP_CHILDREN)[number];
export type SetupSkill = (typeof SETUP_SKILLS)[number];
export type SetupWhen = (typeof SETUP_WHEN)[number];

export type SetupAnswers = {
  children?: SetupChildren;
  skill?: SetupSkill;
  when?: SetupWhen;
  first_session_id?: string;
};

export type ReminderPreference = {
  weekday: number;
  remindAt: string;
};

export const WHEN_DEFAULT_TIMES: Record<SetupWhen, string> = {
  early_morning: "07:00",
  lunch: "12:00",
  evening: "19:00",
  late_night: "21:30",
};

const STEP_SET = new Set<string>(ONBOARDING_STEPS);
const CHILDREN_SET = new Set<string>(SETUP_CHILDREN);
const SKILL_SET = new Set<string>(SETUP_SKILLS);
const WHEN_SET = new Set<string>(SETUP_WHEN);

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === "string" && STEP_SET.has(value);
}

export function isSetupChildren(value: unknown): value is SetupChildren {
  return typeof value === "string" && CHILDREN_SET.has(value);
}

export function isSetupSkill(value: unknown): value is SetupSkill {
  return typeof value === "string" && SKILL_SET.has(value);
}

export function isSetupWhen(value: unknown): value is SetupWhen {
  return typeof value === "string" && WHEN_SET.has(value);
}

export function parseSetupAnswers(raw: unknown): SetupAnswers {
  const source = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const answers: SetupAnswers = {};
  if (isSetupChildren(source.children)) answers.children = source.children;
  if (isSetupSkill(source.skill)) answers.skill = source.skill;
  if (isSetupWhen(source.when)) answers.when = source.when;
  if (typeof source.first_session_id === "string" && source.first_session_id.trim()) {
    answers.first_session_id = source.first_session_id.trim();
  }
  return answers;
}

export function defaultRemindAt(when?: SetupWhen | null) {
  return when ? WHEN_DEFAULT_TIMES[when] : WHEN_DEFAULT_TIMES.evening;
}

export function parseWeekday(value: unknown) {
  const weekday = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
  return weekday;
}

export function parseRemindAt(value: unknown) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  if (!Number.isInteger(hours) || hours > 23) return null;
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

export function resolveOnboardingMode(input: {
  completedAt?: string | null;
  hasCompletedSession: boolean;
  hasReminder?: boolean;
}): OnboardingMode {
  if (input.completedAt) return "done";
  if (input.hasCompletedSession && input.hasReminder) return "done";
  if (input.hasCompletedSession) return "reminder-only";
  return "full";
}

export function currentOnboardingStep(input: {
  mode: OnboardingMode;
  storedStep?: OnboardingStep | null;
  hasReminder: boolean;
  hasAssignedSession: boolean;
  firstSessionComplete?: boolean;
  completedAt?: string | null;
}): OnboardingStep {
  if (input.completedAt) return "done";
  if (
    input.firstSessionComplete &&
    (input.storedStep === "session" ||
      input.storedStep === "hold" ||
      input.storedStep === "complete")
  ) {
    return "complete";
  }
  if (input.mode === "done") return "done";
  if (input.mode === "reminder-only") {
    return input.hasReminder ? "done" : "reminder";
  }

  const stored = input.storedStep && input.storedStep !== "done" ? input.storedStep : "welcome";
  if (
    input.firstSessionComplete &&
    (stored === "session" || stored === "hold" || stored === "complete")
  ) {
    return "complete";
  }
  if (stored === "session" && !input.hasAssignedSession) return "hold";
  if (stored === "hold" && input.hasAssignedSession) return "session";
  return stored;
}

const STEP_HREF: Record<OnboardingStep, string> = {
  welcome: "/father/start/welcome",
  children: "/father/start/children",
  skill: "/father/start/skill",
  when: "/father/start/when",
  reminder: "/father/start/reminder",
  session: "/father/start/session",
  hold: "/father/start/hold",
  complete: "/father/start/complete",
  done: "/father",
};

export function onboardingHref(step: OnboardingStep) {
  return STEP_HREF[step];
}

export function stepRank(step: OnboardingStep) {
  return ONBOARDING_STEPS.indexOf(step);
}

export function canOpenOnboardingStep(requested: OnboardingStep, current: OnboardingStep) {
  if (requested === current) return true;
  if (
    (requested === "session" || requested === "hold") &&
    (current === "session" || current === "hold")
  ) {
    return true;
  }
  return false;
}

export function isFatherStartPath(pathname: string) {
  return pathname === "/father/start" || pathname.startsWith("/father/start/");
}

export function isAssignedSessionPath(pathname: string, sessionId?: string | null) {
  if (!sessionId) return false;
  const base = `/father/sessions/${sessionId}`;
  return pathname === base || pathname === `${base}/checkin` || pathname === `${base}/action`;
}

export function nextStepAfterAnswer(question: "children" | "skill" | "when"): OnboardingStep {
  if (question === "children") return "skill";
  if (question === "skill") return "when";
  return "reminder";
}
