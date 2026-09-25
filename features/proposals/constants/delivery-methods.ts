import { FileText, Link, Mail } from "lucide-react";
import { DeliveryMethod } from "../types/proposal";

export interface DeliveryMethodOption {
  value: DeliveryMethod;
  label: string;
  description: string;
  icon: React.ElementType;
  disabled: boolean;
  phase?: string;
}

export const DELIVERY_METHOD_OPTIONS: DeliveryMethodOption[] = [
  {
    value: DeliveryMethod.PDF_ONLY,
    label: "PDF Attachment Only",
    description: "Send proposal as PDF attachment via email",
    icon: FileText,
    disabled: false,
  },
  {
    value: DeliveryMethod.ONLINE_ONLY,
    label: "Online Link Only",
    description: "Send a secure tracked link to view the proposal",
    icon: Link,
    disabled: false,
  },
  {
    value: DeliveryMethod.BOTH,
    label: "Both PDF & Online Link",
    description: "Send both the PDF attachment and secure tracked link",
    icon: Mail,
    disabled: false,
  },
];
