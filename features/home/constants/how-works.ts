import { CheckCircle, FileText, Zap } from "lucide-react";

export const HOW_WORKS_ITEMS = [
  {
    step: "01",
    title: "Facility Intelligence Input",
    description:
      "Enter client and site context, service type, and facility details. Operational inputs, not form filling.",
    icon: FileText,
  },
  {
    step: "02",
    title: "Scope & Frequency Logic",
    description:
      "Operational Intelligence Engine applies labor, frequency, and margin rules from real janitorial operations.",
    icon: Zap,
  },
  {
    step: "03",
    title: "Client-Ready Output",
    description:
      "Labor + margin modeling produces branded, client-ready proposals. All outputs constrained by your rules.",
    icon: CheckCircle,
  },
];
