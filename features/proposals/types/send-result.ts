export interface SendResultSuccess {
  success: true;
  message: string;
  trackingId?: string;
}

export interface SendResultFailure {
  success: false;
  message: string;
  errorCode: string;
  errorDetails?: string;
}

export enum DeliveryMethod {
  PDF_ONLY = "pdf_only",
  ONLINE_ONLY = "online_only",
  BOTH = "both",
}

export interface SendProposalFormData {
  delivery_method: DeliveryMethod;
  recipient_email: string;
  cc_emails?: string;
  subject: string;
  message: string;
  include_company_branding: boolean;
  send_copy_to_self: boolean;
  track_downloads: boolean;
}

export interface SendProposalState {
  isSending: boolean;
  progress: string;
  result: SendResult | null;
}

// Consumers narrow with `result.success` — TypeScript then knows the exact shape.
export type SendResult = SendResultSuccess | SendResultFailure;
