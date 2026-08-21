import type { FirstPartyAssessment } from "@/lib/assessments/first-party";
import { isChoiceItem } from "@/lib/assessments/instrument";
import {
  PROFILE_QUESTIONS,
  PROFILE_SCALE,
} from "@/lib/father/questions";

export type InstrumentReviewChoice = {
  key: string;
  label: string;
};

export type InstrumentReviewQuestion = {
  id: string;
  prompt: string;
  choices: InstrumentReviewChoice[];
};

export type InstrumentReviewBand = {
  range: string;
  label: string;
  description: string | null;
};

export type InstrumentReviewCopy = {
  introduction: string;
  purpose: string;
  goal: string;
  honestHint: string;
};

export type InstrumentReviewModel = {
  questionCount: number;
  copy: InstrumentReviewCopy | null;
  sharedScale: InstrumentReviewChoice[] | null;
  questions: InstrumentReviewQuestion[];
  bands: InstrumentReviewBand[];
};

export function firstPartyInstrumentReview(
  assessment: FirstPartyAssessment
): InstrumentReviewModel {
  const questions = assessment.instrument.items.filter(isChoiceItem).map((item) => ({
    id: item.id,
    prompt: item.prompt,
    choices: item.choices.map((choice) => ({ key: choice.key, label: choice.label })),
  }));
  const bands =
    assessment.instrument.scoring.outcome.kind === "bands"
      ? assessment.instrument.scoring.outcome.bands.map((band) => ({
          range: `${band.min}-${band.max}`,
          label: band.label,
          description: band.description ?? null,
        }))
      : [];

  return {
    questionCount: questions.length,
    copy: { ...assessment.copy },
    sharedScale: null,
    questions,
    bands,
  };
}

export function keystoneInstrumentReview(): InstrumentReviewModel {
  return {
    questionCount: PROFILE_QUESTIONS.length,
    copy: null,
    sharedScale: PROFILE_SCALE.map((entry) => ({
      key: String(entry.value),
      label: entry.label,
    })),
    questions: PROFILE_QUESTIONS.map((question) => ({
      id: String(question.id),
      prompt: question.text,
      choices: [],
    })),
    bands: [],
  };
}
