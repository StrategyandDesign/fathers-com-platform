export type AnswerMap = Record<string, number>;

export type ProfileResult = {
  primary_edge: string;
  primary_determination: string;
  scores?: Record<string, number>;
  model_id?: string;
  model_version?: string;
};

export type ScoringModel = {
  id: string;
  version: string;
  evaluate(answers: AnswerMap): ProfileResult;
};
