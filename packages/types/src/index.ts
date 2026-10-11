export type HealthResponse = { status: "ok"; service: "lingoloop-api" };
export type AnswerResult = "correct" | "wrong" | "typo";
export type AuthUser = {
  id: string;
  email: string;
  profile: {
    learningGoals: string[];
    selfReportedLevel: number | null;
    dailyGoal: number;
    timezone: string;
    onboardingCompleted: boolean;
  } | null;
};
export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export * from "./content";

export * from "./import";
export * from "./learning";
export * from "./progress";
export * from "./preferences";
export * from "./level-test";
