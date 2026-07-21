import type { AnalyticsEventName } from "./events";

export type ProposalFlow = "quick" | "advanced";
export type AnalyticsFailureType = "http" | "network" | "invalid_response";

export interface AnalyticsEventProperties {
  landing_cta_clicked: {
    placement: "hero" | "gradient" | "header" | "pricing";
    destination: "demo" | "signup" | "login" | "pricing";
  };
  demo_started: {
    demo_type: string;
    package_type?: string;
  };
  create_my_real_proposal_clicked: {
    demo_type: string;
    scope_template_id: string;
  };
  signup_completed: {
    auth_method: string;
    $insert_id: string;
  };
  quick_proposal_started: {
    source: string;
    demo_type: string;
    scope_template_id: string;
  };
  quick_proposal_completed: {
    source: string;
    demo_type: string;
    scope_template_id: string;
  };
  proposal_generation_started: {
    flow: ProposalFlow;
    is_regenerate: boolean;
  };
  proposal_generated: {
    flow: ProposalFlow;
    is_regenerate: boolean;
  };
  proposal_generation_failed: {
    flow: ProposalFlow;
    failure_type: AnalyticsFailureType;
    status_code?: number;
  };
  proposal_save_started: {
    flow: ProposalFlow;
  };
  proposal_saved: {
    flow: ProposalFlow;
  };
  proposal_save_failed: {
    flow: ProposalFlow;
    failure_type: AnalyticsFailureType;
    status_code?: number;
  };
  trial_usage_consumed: {
    usage_number: number;
    remaining_proposals: number;
    trial_type: "free_trial" | "stripe_trial";
    $insert_id: string;
  };
  upgrade_clicked: {
    placement: string;
    destination: "billing";
  };
  checkout_started: {
    plan: string;
  };
  subscription_started: {
    plan: string;
    subscription_status: string;
    $insert_id: string;
  };
}

export type AnalyticsProperties<E extends AnalyticsEventName> =
  AnalyticsEventProperties[E];

export interface ServerAnalyticsEvent<E extends AnalyticsEventName> {
  distinctId: string;
  event: E;
  properties: AnalyticsProperties<E>;
}
