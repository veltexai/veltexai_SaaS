export const ANALYTICS_EVENTS = {
  LANDING_CTA_CLICKED: "landing_cta_clicked",
  DEMO_STARTED: "demo_started",
  CREATE_MY_REAL_PROPOSAL_CLICKED: "create_my_real_proposal_clicked",
  SIGNUP_COMPLETED: "signup_completed",
  QUICK_PROPOSAL_STARTED: "quick_proposal_started",
  QUICK_PROPOSAL_COMPLETED: "quick_proposal_completed",
  PROPOSAL_GENERATION_STARTED: "proposal_generation_started",
  PROPOSAL_GENERATED: "proposal_generated",
  PROPOSAL_GENERATION_FAILED: "proposal_generation_failed",
  PROPOSAL_SAVE_STARTED: "proposal_save_started",
  PROPOSAL_SAVED: "proposal_saved",
  PROPOSAL_SAVE_FAILED: "proposal_save_failed",
  TRIAL_USAGE_CONSUMED: "trial_usage_consumed",
  UPGRADE_CLICKED: "upgrade_clicked",
  CHECKOUT_STARTED: "checkout_started",
  SUBSCRIPTION_STARTED: "subscription_started",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
