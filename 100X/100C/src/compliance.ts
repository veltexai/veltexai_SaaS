export interface OutboundComplianceConfig {
  approved: boolean;
  senderName: string;
  fromEmail: string;
  replyTo: string;
  postalAddress: string;
  unsubscribeUrl: string;
  spfDkimDmarcVerified: boolean;
  oneClickUnsubscribeVerified: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTPS_RE = /^https:\/\//i;

export function loadOutboundCompliance(env: Record<string, string | undefined>): OutboundComplianceConfig {
  return {
    approved: env.VELTEX_100C_COMPLIANCE_APPROVED === "true",
    senderName: env.VELTEX_100C_SENDER_NAME?.trim() ?? "",
    fromEmail: env.VELTEX_100C_FROM_EMAIL?.trim().toLowerCase() ?? "",
    replyTo: env.VELTEX_100C_REPLY_TO?.trim().toLowerCase() ?? "",
    postalAddress: env.VELTEX_100C_POSTAL_ADDRESS?.trim() ?? "",
    unsubscribeUrl: env.VELTEX_100C_UNSUBSCRIBE_URL?.trim() ?? "",
    spfDkimDmarcVerified: env.VELTEX_100C_SPF_DKIM_DMARC_VERIFIED === "true",
    oneClickUnsubscribeVerified: env.VELTEX_100C_ONE_CLICK_UNSUBSCRIBE_VERIFIED === "true",
  };
}

export function assertOutboundComplianceReady(compliance: OutboundComplianceConfig): void {
  if (!compliance.approved) throw new Error("outbound compliance approval is required");
  if (!compliance.senderName) throw new Error("sender name is required");
  if (!EMAIL_RE.test(compliance.fromEmail)) throw new Error("valid From email is required");
  if (!EMAIL_RE.test(compliance.replyTo)) throw new Error("valid Reply-To email is required");
  if (!compliance.postalAddress) throw new Error("physical postal address is required");
  if (!HTTPS_RE.test(compliance.unsubscribeUrl)) throw new Error("HTTPS unsubscribe URL is required");
  if (!compliance.spfDkimDmarcVerified) throw new Error("SPF, DKIM, and DMARC verification is required");
  if (!compliance.oneClickUnsubscribeVerified) throw new Error("one-click unsubscribe verification is required");
}
