import { ProposalFormData } from "@/lib/validations/proposal";
import { UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";

export const handleSelectTemplate = (setValue: UseFormSetValue<ProposalFormData>, templateId: string): void => {
    setValue('template_id', templateId, { shouldValidate: true });
    toast.success('Template selected successfully');
  };