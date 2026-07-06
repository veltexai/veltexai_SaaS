import type {
  ResidentialPackageConfig,
  ResidentialPackageType,
} from "../types/demo-proposal";

export const RESIDENTIAL_PACKAGES: ResidentialPackageConfig[] = [
  {
    type: "recurring",
    label: "Recurring Cleaning",
    subtitle: "Bi-weekly maintenance for busy households",
    badge: "Most popular",
    priceSummary: "From $440/month",
  },
  {
    type: "deep-clean",
    label: "Deep Cleaning",
    subtitle: "Comprehensive one-time home reset",
    badge: "Best first visit",
    priceSummary: "From $640",
  },
  {
    type: "move-in-out",
    label: "Move-In / Move-Out",
    subtitle: "Transition cleaning for new and departing tenants",
    badge: "Deposit-ready",
    priceSummary: "From $495",
  },
  {
    type: "premium-detail",
    label: "Premium Detail Cleaning",
    subtitle: "White-glove monthly care for high-value homes",
    badge: "Estate quality",
    priceSummary: "From $1,200/month",
  },
];

export const RESIDENTIAL_PACKAGE_LABELS: Record<ResidentialPackageType, string> =
  {
    recurring: "Recurring Cleaning",
    "deep-clean": "Deep Cleaning",
    "move-in-out": "Move-In / Move-Out",
    "premium-detail": "Premium Detail Cleaning",
  };
