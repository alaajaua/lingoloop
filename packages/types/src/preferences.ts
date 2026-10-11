export type DailyProgress = {
  goal: number;
  answered: number;
  remaining: number;
  timezone: string;
};
export type LearningPreferences = {
  learningGoals: string[];
  selfReportedLevel: number | null;
  dailyGoal: number;
  timezone: string;
  daily: DailyProgress;
};
