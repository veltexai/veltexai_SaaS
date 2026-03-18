export const PRICE_ITEMS = (billingCycle: "monthly" | "yearly") => [
  {
    name: "Starter",
    price: billingCycle === "monthly" ? 19.99 : 24,
    period: billingCycle === "monthly" ? "/month" : "/month (billed annually)",
    description: "Small cleaning businesses",
    features: [
      "20 proposals per month",
      "1 AI template to start",
      "PDF export",
      "Email support",
      "Basic branding",
    ],
    popular: false,
  },
  {
    name: "Professional",
    price: billingCycle === "monthly" ? 39.99 : 64,
    period: billingCycle === "monthly" ? "/month" : "/month (billed annually)",
    description: "Growing cleaning companies",
    features: [
      "75 proposals per month",
      "All AI templates",
      "Custom branding",
      "Priority support",
      "Analytics dashboard",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: billingCycle === "monthly" ? 79.99 : 159,
    period: billingCycle === "monthly" ? "/month" : "/month (billed annually)",
    description: "Large cleaning operations",
    features: [
      "Unlimited proposals",
      "All AI templates",
      "Custom branding",
      "Dedicated support",
      "Analytics dashboard",
    ],
    popular: false,
  },
];
