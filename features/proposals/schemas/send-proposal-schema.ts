import { z } from "zod";
import { DeliveryMethod } from "../types/proposal";

export const sendProposalSchema = z.object({
  delivery_method: z.nativeEnum(DeliveryMethod, {
    required_error: "Please select a delivery method",
  }),
  recipient_email: z.string().email("Please enter a valid email address"),
  cc_emails: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  include_company_branding: z.boolean(),
  send_copy_to_self: z.boolean(),
});

export type SendProposalFormData = z.infer<typeof sendProposalSchema>;
