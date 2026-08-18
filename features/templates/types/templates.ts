import { Database } from '@/types/database';

export type Proposal = Database['public']['Tables']['proposals']['Row'];
export type ProposalTemplateRow =
  Database['public']['Tables']['proposal_templates']['Row'];

export type TemplateType =
  | 'basic'
  | 'executive_premium'
  | 'modern_corporate'
  | 'luxury_elite';

/**
 * Optional image overrides for a template. Every slot is `??`-guarded at the
 * render site, so an omitted (or entirely absent) override renders the stock
 * template art. Produced in production by `resolveTemplateImages` and in the
 * demo flow by `getDemoTemplateData`.
 *
 * In production the photo slots below come from the proposal's service type —
 * `resolveServicePhotos` picks them out of `public/images/templates/commercial`
 * or `.../residential`, seeded by proposal id so the preview and the printed
 * PDF always agree. Service types without a folder yet fall back to stock art.
 */
export interface TemplateImages {
  /** Full-bleed cover background (luxury_elite bgLuxi, basic blue SVG). */
  coverBg?: string;
  /** Cover photograph (executive_premium, modern_corporate). */
  coverImage?: string;
  /** Cover mask overlay (luxury_elite only). */
  coverMask?: string;
  /** Table-of-contents photo (luxury_elite only — other TOCs render no image). */
  tocImage?: string;
  /** About / page-three photo. */
  aboutImage?: string;
  /** Qualifications page photo. */
  qualificationsImage?: string;
  /** Closing "thank you" page photo. */
  thankYouImage?: string;
  /** Inline CSS variable override for --color-primary. */
  accentColor?: string;
}

export interface TemplateProps {
  proposal: Proposal & { template?: ProposalTemplateRow | null };
  template?: ProposalTemplateRow | null;
  branding?: {
    name?: string;
    logo_url?: string | null;
    phone?: string | null;
    website?: string | null;
    email?: string | null;
  };
  pages?: string[];
  print?: boolean;
  extrasRows?: Array<{
    service: string;
    pricePerTime: string | null;
    pricePerMonth: string | null;
  }>;
  /** Per-proposal image and accent overrides. Falls back to stock art when omitted. */
  images?: TemplateImages;
  /**
   * When false, the Veltex footer logo is suppressed on every page.
   * Consumed by PrintTemplateSwitcher only — never forwarded to the templates.
   */
  showPoweredBy?: boolean;
}

export type Branding = {
  name?: string;
  logo_url?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
};

// Map global template types to acceptance UI variants
export const acceptanceVariantMap: Record<
  TemplateType,
  'modern' | 'classic' | 'minimal' | 'professional'
> = {
  basic: 'minimal',
  modern_corporate: 'modern',
  executive_premium: 'professional',
  luxury_elite: 'classic',
};
