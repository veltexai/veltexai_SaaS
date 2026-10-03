export const VELTEX_BRAND = Object.freeze({
  masterBrand: 'Veltex',
  operationalBrand: 'Veltex AI',
  category: 'The cleaning business operating system',
  promise: 'Run your cleaning business from walkthrough to profit.',
  technologyProof: 'AI-assisted where it saves time. Your team controls the scope, price, and final decision.',
  domain: 'veltexai.com',
} as const);

export const BRAND_VALIDATION_VARIANTS = Object.freeze({
  A: Object.freeze({
    id: 'veltex-ai-operating-system',
    headline: 'Veltex AI',
    category: 'AI Operating System for Cleaning Companies',
  }),
  B: Object.freeze({
    id: 'veltex-cleaning-business-operating-system',
    headline: 'Veltex',
    category: 'Cleaning Business Operating System',
  }),
  C: Object.freeze({
    id: 'veltex-ai-assisted-estimating',
    headline: 'Veltex',
    category: 'Cleaning Business Software with AI-Assisted Estimating',
  }),
} as const);

export type BrandValidationVariant = keyof typeof BRAND_VALIDATION_VARIANTS;

export const BRAND_TRUST_POINTS = Object.freeze([
  'You control the scope, price, and final decision.',
  'Pricing uses visible, deterministic calculations and editable assumptions.',
  'Customer information stays private to the authorized organization.',
  'Manual workflows remain available when AI assistance is disabled or unavailable.',
] as const);

export const BRAND_PROHIBITED_CLAIM_PATTERNS = Object.freeze([
  /perfect (?:ai )?pricing/i,
  /guaranteed profit/i,
  /guaranteed business success/i,
  /fully automated business management/i,
  /ai (?:that )?runs your (?:cleaning )?company/i,
] as const);

export function brandVariant(variant: BrandValidationVariant) {
  return BRAND_VALIDATION_VARIANTS[variant];
}

export function findProhibitedBrandClaim(copy: string): string | null {
  const match = BRAND_PROHIBITED_CLAIM_PATTERNS.find((pattern) => pattern.test(copy));
  return match?.source ?? null;
}
