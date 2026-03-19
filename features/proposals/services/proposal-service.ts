import type { SendProposalFormData } from "../schemas/send-proposal-schema";
import type {
  SendProposalApiResponse,
  SendProposalApiError,
} from "../types/proposal";

export class ProposalApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: string,
  ) {
    super(message);
    this.name = "ProposalApiError";
  }
}

export async function sendProposalRequest(
  proposalId: string,
  data: SendProposalFormData,
): Promise<SendProposalApiResponse> {
  const payload = {
    ...data,
    cc_emails: data.cc_emails
      ? data.cc_emails.split(",").map((e) => e.trim())
      : [],
  };

  let response: Response;

  try {
    response = await fetch(`/api/proposals/${proposalId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Network-level failure (offline, DNS, CORS, etc.)
    throw new ProposalApiError(
      "Unable to connect to the server. Please check your internet connection and try again.",
      "NETWORK_ERROR",
    );
  }

  if (!response.ok) {
    const errorData: SendProposalApiError = await response.json();
    throw new ProposalApiError(
      errorData.message || errorData.error || "Failed to send proposal",
      errorData.code ?? "API_ERROR",
      errorData.details,
    );
  }

  return response.json() as Promise<SendProposalApiResponse>;
}
