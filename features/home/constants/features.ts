import {
  BarChart3,
  CheckCircle,
  FileText,
  Shield,
  Users,
  Zap,
} from "lucide-react";

export const FEATURES = [
  {
    title: "Operational Intelligence Engine",
    description:
      "Scope → Labor → Pricing → Proposal. Outputs constrained by real janitorial labor, frequency, and margin rules.",
    icon: Zap,
  },
  {
    title: "Instant PDF Export",
    description:
      "Professional, branded PDFs ready to send to clients immediately.",
    icon: FileText,
  },
  {
    title: "Subscription Management",
    description:
      "Flexible plans with usage limits that scale with your business.",
    icon: BarChart3,
  },
  {
    title: "Secure Multi-Tenant",
    description:
      "Enterprise-grade security with isolated client data and accounts.",
    icon: Shield,
  },
  {
    title: "Admin Dashboard",
    description:
      "Comprehensive dashboard for managing proposals, clients, and team members.",
    icon: Users,
  },
  {
    title: "Stripe Integration",
    description:
      "Seamless payment processing and subscription billing built-in.",
    icon: CheckCircle,
  },
];
