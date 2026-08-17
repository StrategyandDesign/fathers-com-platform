import {
  PROFILE_QUESTIONS,
  PROFILE_THEMES,
  type ProfileQuestion,
} from "@/lib/father/questions";

export type ProfileEvaluation = {
  primary_edge: string;
  primary_determination: string;
  raw_scores: {
    average: number;
    byTheme: Record<string, number>;
  };
  full_results: {
    model: "placeholder-v1";
    answered: number;
    edge: string;
    determination: string;
  };
};

function themeAverage(
  questions: ProfileQuestion[],
  answers: Record<string, number>,
  key: string
) {
  const scored = questions.filter((question) => question.theme.key === key);
  const values = scored
    .map((question) => answers[String(question.id)])
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function topLabel(
  answers: Record<string, number>,
  kind: "edge" | "determination"
) {
  const themes = PROFILE_THEMES.filter((theme) => theme.kind === kind);
  let best = themes[0];
  let bestScore = -1;

  for (const theme of themes) {
    const score = themeAverage(PROFILE_QUESTIONS, answers, theme.key);
    if (score > bestScore) {
      best = theme;
      bestScore = score;
    }
  }

  return best.label;
}

/** Placeholder only. Replace with the proprietary model later. */
export function evaluatePlaceholder(
  answers: Record<string, number>
): ProfileEvaluation {
  const values = Object.values(answers);
  const average =
    values.length === 0
      ? 0
      : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;

  const byTheme = Object.fromEntries(
    PROFILE_THEMES.map((theme) => [
      theme.key,
      Math.round(themeAverage(PROFILE_QUESTIONS, answers, theme.key) * 10) / 10,
    ])
  );

  const primary_edge = topLabel(answers, "edge");
  const primary_determination = topLabel(answers, "determination");

  return {
    primary_edge,
    primary_determination,
    raw_scores: { average, byTheme },
    full_results: {
      model: "placeholder-v1",
      answered: values.length,
      edge: primary_edge,
      determination: primary_determination,
    },
  };
}
