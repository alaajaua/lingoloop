export type LevelTestView = {
  id: string;
  cursor: number;
  total: number;
  completed: boolean;
  estimate: number | null;
  correct: number;
  question: null | { sentence: string; translation: string };
};
export type LevelTestStart =
  LevelTestView | { unavailable: true; available: number; required: number };
export type LevelTestFeedback = {
  correct: boolean;
  answer: string;
  meaning: string;
  view: LevelTestView;
};
