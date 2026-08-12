import { assertOutboundComplianceReady, type OutboundComplianceConfig } from "./compliance";

export interface CompliancePreflight {
  ok: boolean;
  checks: Record<string, "pass" | "fail" | "pending">;
  blockingReasons: string[];
}

export function evaluateCompliancePreflight(config: OutboundComplianceConfig, controls: { globalSendPaused?: boolean; newAudiencePaused?: boolean } = {}): CompliancePreflight {
  const checks: CompliancePreflight["checks"] = {
    approval: config.approved ? "pass" : "fail",
    sender_identity: config.senderName && config.fromEmail && config.replyTo ? "pass" : "fail",
    postal_address: config.postalAddress ? "pass" : "fail",
    unsubscribe: config.unsubscribeUrl ? "pass" : "fail",
    domain_authentication: config.spfDkimDmarcVerified ? "pass" : "fail",
    one_click_unsubscribe: config.oneClickUnsubscribeVerified ? "pass" : "fail",
    global_send_pause: controls.globalSendPaused ? "fail" : "pass",
    new_audience_pause: controls.newAudiencePaused ? "fail" : "pass",
  };
  const blockingReasons = Object.entries(checks).filter(([, value]) => value !== "pass").map(([key]) => key);
  if (blockingReasons.length === 0) {
    try { assertOutboundComplianceReady(config); } catch (error) { blockingReasons.push(error instanceof Error ? error.message : "compliance validation failed"); }
  }
  return { ok: blockingReasons.length === 0, checks, blockingReasons };
}
