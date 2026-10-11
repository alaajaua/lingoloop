export type AnalyticsEvent =
  | "app_opened"
  | "welcome_viewed"
  | "signup_cta_tapped"
  | "login_cta_tapped"
  | "signup_started"
  | "signup_failed"
  | "login_started"
  | "login_completed"
  | "login_failed"
  | "signup_completed"
  | "onboarding_completed"
  | "level_test_started"
  | "level_test_completed"
  | "learning_session_started"
  | "question_viewed"
  | "hint_used"
  | "question_answered"
  | "feedback_viewed"
  | "learning_session_completed"
  | "daily_goal_completed"
  | "streak_qualified"
  | "paywall_viewed"
  | "purchase_started"
  | "subscription_activated"
  | "subscription_cancelled";
export type AnalyticsProperties = Readonly<
  Record<string, string | number | boolean>
>;
export type AnalyticsAdapter = (
  event: AnalyticsEvent,
  properties: AnalyticsProperties,
) => void | Promise<void>;
// No outbound collection until an adapter is explicitly configured.
export function createAnalytics(adapter?: AnalyticsAdapter) {
  return {
    async track(
      event: AnalyticsEvent,
      properties: AnalyticsProperties = {},
    ): Promise<void> {
      try {
        await adapter?.(event, properties);
      } catch {
        /* Telemetry must not interrupt learning. */
      }
    },
  };
}
