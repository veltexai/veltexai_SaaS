import { useState } from "react";
import { toast } from "sonner";
import type { SendProposalFormData } from "../schemas/send-proposal-schema";
import {
  sendProposalRequest,
  ProposalApiError,
} from "../services/proposal-service";
import { SendResult } from "../types/send-result";

// Progress steps make the UX feel alive during a slow PDF generation.
const PROGRESS_STEPS = {
  PREPARING: "Preparing proposal... ⚙️",
  GENERATING_PDF:
    "Generating PDF (Fonts, Images, etc.) 📄 – this may take >30 seconds, please don't close the window",
  SENDING_EMAIL: "PDF generated! Sending email... 📧",
  DONE: "Email sent successfully! ✅",
} as const;

interface UseSendProposalReturn {
  isSending: boolean;
  progress: string;
  result: SendResult | null;
  handleSend: (proposalId: string, data: SendProposalFormData) => Promise<void>;
  resetResult: () => void;
}

export function useSendProposal(): UseSendProposalReturn {
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);

  const handleSend = async (
    proposalId: string,
    data: SendProposalFormData,
  ): Promise<void> => {
    setIsSending(true);
    setResult(null);

    try {
      setProgress(PROGRESS_STEPS.PREPARING);
      // Brief intentional pause so the user sees the progress state.
      await new Promise((resolve) => setTimeout(resolve, 500));

      setProgress(PROGRESS_STEPS.GENERATING_PDF);
      const apiResponse = await sendProposalRequest(proposalId, data);

      setProgress(PROGRESS_STEPS.SENDING_EMAIL);
      setProgress(PROGRESS_STEPS.DONE);

      const successResult: SendResult = {
        success: true,
        message: "Proposal sent successfully!",
        trackingId: apiResponse.trackingId,
      };

      setResult(successResult);
      toast.success(successResult.message);
    } catch (error) {
      setProgress("");

      const failureResult: SendResult =
        error instanceof ProposalApiError
          ? {
              success: false,
              message: error.message,
              errorCode: error.code,
              errorDetails: error.details,
            }
          : {
              success: false,
              message:
                "An unexpected error occurred while sending the proposal.",
              errorCode: "UNKNOWN_ERROR",
            };

      setResult(failureResult);
      toast.error(failureResult.message);
    } finally {
      setIsSending(false);
    }
  };

  return {
    isSending,
    progress,
    result,
    handleSend,
    resetResult: () => setResult(null),
  };
}
