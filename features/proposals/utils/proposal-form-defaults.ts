import type { SendProposalFormData } from "../schemas/send-proposal-schema";
import { DeliveryMethod } from "../types/proposal";
import type { SendModalProposal } from "./send-modal-proposal";

export function buildSendProposalDefaults(
  proposal: SendModalProposal,
): SendProposalFormData {
  const greeting = proposal.client_name
    ? `Dear ${proposal.client_name}`
    : "Dear Valued Client";

  return {
    delivery_method: DeliveryMethod.PDF_ONLY,
    recipient_email: proposal.client_email ?? "",
    cc_emails: "",
    subject: `Proposal: ${proposal.title}`,
    message: `${greeting},

I hope this message finds you well. I'm pleased to present our detailed proposal for your cleaning service needs.

This proposal includes:
• Comprehensive service overview
• Detailed pricing breakdown
• Our commitment to quality and reliability
• Next steps for moving forward

Please review the attached proposal and don't hesitate to reach out if you have any questions or would like to discuss any aspects in detail.

I look forward to the opportunity to serve you.

Best regards,
Veltex AI Team`,
    include_company_branding: true,
    send_copy_to_self: false,
  };
}
