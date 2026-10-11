export type LearningView = {
  id: string;
  wordCount: number;
  source: string;
  nextReviewAt: string | null;
  cursor: number;
  total: number;
  completed: boolean;
  remembered: number;
  question: null | {
    sentence: string;
    translation: string;
    hint: string | null;
  };
};
export type LearningFeedback = {
  correct: boolean;
  hintUsed: boolean;
  answer: string;
  meaning: string;
  full: string;
  note: string;
  audioUrl: string | null;
  view: LearningView;
};

export type LearningStart =
  LearningView | { empty: true; reason?: "goal"; nextReviewAt: string | null };
