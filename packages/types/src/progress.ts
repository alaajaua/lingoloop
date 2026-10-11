import type { DailyProgress } from "./preferences";
export type ProgressOverview = {
  asOf: string;
  daily: DailyProgress;
  learned: number;
  due: number;
  completedSessions: number;
  nextReviewAt: string | null;
  hasActiveSession: boolean;
  vocabulary: {
    page: number;
    total: number;
    pageSize: number;
    items: {
      id: string;
      word: string;
      meaning: string;
      stage: number;
      nextReviewAt: string;
      due: boolean;
    }[];
  };
  history: {
    page: number;
    total: number;
    pageSize: number;
    items: {
      id: string;
      startedAt: string;
      lastActivityAt: string;
      completed: boolean;
      attempts: number;
      independentCorrect: number;
      hinted: number;
      wrong: number;
    }[];
  };
};
