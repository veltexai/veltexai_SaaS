import { ANALYTICS_EVENTS } from "../events";

describe("PostHog event contract", () => {
  it("uses the complete snake_case C7 event set", () => {
    expect(Object.values(ANALYTICS_EVENTS)).toEqual([
      "landing_cta_clicked",
      "demo_started",
      "create_my_real_proposal_clicked",
      "signup_completed",
      "quick_proposal_started",
      "quick_proposal_completed",
      "proposal_generation_started",
      "proposal_generated",
      "proposal_generation_failed",
      "proposal_save_started",
      "proposal_saved",
      "proposal_save_failed",
      "trial_usage_consumed",
      "upgrade_clicked",
      "checkout_started",
      "subscription_started",
    ]);

    for (const event of Object.values(ANALYTICS_EVENTS)) {
      expect(event).toMatch(/^[a-z]+(?:_[a-z]+)*$/);
    }
  });
});
