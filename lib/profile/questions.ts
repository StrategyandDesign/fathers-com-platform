import type { AnswerMap } from "@/lib/profile/types";

export const PROFILE_QUESTION_COUNT = 128;

export const PROFILE_SCALE = [
  { value: 1, label: "Mostly false" },
  { value: 2, label: "Somewhat false" },
  { value: 3, label: "Uncertain" },
  { value: 4, label: "Somewhat true" },
  { value: 5, label: "Mostly true" },
] as const;

export const PROFILE_SCALE_MIN = PROFILE_SCALE[0].value;
export const PROFILE_SCALE_MAX = PROFILE_SCALE[PROFILE_SCALE.length - 1].value;

export type ProfileThemeKind = "edge" | "determination";

export type ProfileTheme = {
  key: string;
  kind: ProfileThemeKind;
  label: string;
};

/** Display order. Primary picks break ties by key, not this order. */
export const PROFILE_THEMES: ProfileTheme[] = [
  { key: "involvement", kind: "edge", label: "Involvement" },
  { key: "consistency", kind: "edge", label: "Consistency" },
  { key: "awareness", kind: "edge", label: "Awareness" },
  { key: "nurturance", kind: "edge", label: "Nurturance" },
  { key: "presence", kind: "determination", label: "Come home present" },
  { key: "steadiness", kind: "determination", label: "Stay steady" },
  { key: "repair", kind: "determination", label: "Repair first" },
  { key: "return", kind: "determination", label: "Keep coming back" },
];

const STEMS: Record<string, string[]> = {
  involvement: [
    "I make time to be with my child.",
    "I take part in the ordinary parts of my child’s day.",
    "I follow through when I say I will show up.",
    "I stay in my child’s life, not just the big moments.",
  ],
  consistency: [
    "My child knows what to expect from me.",
    "I keep the same rules from one day to the next.",
    "I do what I said I would do.",
    "I am steady enough that home feels predictable.",
  ],
  awareness: [
    "I notice how my child is actually doing.",
    "I can name what my child cares about right now.",
    "I catch my own mood before it lands on my child.",
    "I pay attention to the small changes in my child.",
  ],
  nurturance: [
    "I let my child know they matter to me.",
    "I speak to my child with warmth, even when I am firm.",
    "I make room for my child’s feelings.",
    "I look for ways to encourage my child.",
  ],
  presence: [
    "When I am with my child, I am actually there.",
    "I put the noise down and give my child my attention.",
    "I walk into the room as myself, not as the day I just had.",
    "I stay with my child through the ordinary hour.",
  ],
  steadiness: [
    "I can feel pressure rise without handing it to my child.",
    "I take a beat before I speak when I am hot.",
    "I keep my word when the moment gets loud.",
    "I come back to calm instead of staying in the surge.",
  ],
  repair: [
    "When I get it wrong, I own it the same day.",
    "I can say a short apology without defending myself.",
    "I go first when something breaks between us.",
    "I treat a rupture as work to do, not as the end.",
  ],
  return: [
    "I keep showing up after I have been away.",
    "I meet the child in front of me, not the one I remember.",
    "I make small deposits instead of waiting for a big moment.",
    "I treat coming back as a season, not a single day.",
  ],
};

const QUALIFIERS = [
  "This is true of me most weeks.",
  "I can point to a recent example.",
  "I do this without being reminded.",
  "I keep this up when life gets loud.",
];

export type ProfileQuestion = {
  id: number;
  text: string;
  scaleMin: number;
  scaleMax: number;
  theme: ProfileTheme;
  dimensions: Record<string, number>;
};

function buildProfileQuestions(): ProfileQuestion[] {
  return Array.from({ length: PROFILE_QUESTION_COUNT }, (_, index) => {
    const theme = PROFILE_THEMES[index % PROFILE_THEMES.length];
    const stems = STEMS[theme.key];
    const stem = stems[Math.floor(index / PROFILE_THEMES.length) % stems.length];
    const qualifier =
      QUALIFIERS[
        Math.floor(index / (PROFILE_THEMES.length * stems.length)) % QUALIFIERS.length
      ];

    return {
      id: index + 1,
      text: `${stem} ${qualifier}`,
      scaleMin: PROFILE_SCALE_MIN,
      scaleMax: PROFILE_SCALE_MAX,
      theme,
      dimensions: { [theme.key]: 1 },
    };
  });
}

export const PROFILE_QUESTIONS: ProfileQuestion[] = buildProfileQuestions();

export function getProfileQuestion(id: number) {
  return PROFILE_QUESTIONS[id - 1] ?? null;
}

export function parseAnswers(value: unknown): AnswerMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const answers: AnswerMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (Number.isInteger(parsed) && parsed >= PROFILE_SCALE_MIN && parsed <= PROFILE_SCALE_MAX) {
      answers[key] = parsed;
    }
  }
  return answers;
}

export function answeredCount(answers: AnswerMap) {
  return PROFILE_QUESTIONS.filter((question) => answers[String(question.id)] != null).length;
}

export function firstUnanswered(answers: AnswerMap) {
  const missing = PROFILE_QUESTIONS.find((question) => answers[String(question.id)] == null);
  return missing?.id ?? PROFILE_QUESTION_COUNT;
}

export function hasAllAnswers(answers: AnswerMap) {
  return answeredCount(answers) === PROFILE_QUESTION_COUNT;
}
