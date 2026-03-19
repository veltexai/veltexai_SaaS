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
    description: "Send secure online link to view proposal (Coming soon)",
    icon: Link,
    disabled: true,
    phase: "Phase 2",
  },
  {
    value: DeliveryMethod.BOTH,
    label: "Both PDF & Online Link",
    description:
      "Send both PDF attachment and online viewing link (Coming soon)",
    icon: Mail,
    disabled: true,
    phase: "Phase 2",
  },
];
