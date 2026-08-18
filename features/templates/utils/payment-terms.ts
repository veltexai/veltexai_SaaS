// Single source of truth for proposal payment terms.
//
// Deliberately dependency-free — the only import is a type, erased at build —
// so both the server render path and the public "use client" /demo-proposal
// bundle can resolve terms without dragging anything else in. Mirrors the
// `service-photos.ts` pattern, including its defensive handling of the
// free-form Json columns.

/** The two categories that drive payment terms. */
export type ServiceCategory = 'commercial' | 'residential';

export interface PaymentTerms {
  /** Short label shown on the pricing page — "Net 30" | "Due Upon Completion". */
  label: string;
  /** The one-line rule stated to the client. */
  description: string;
  /** Full "Billing & Payment Terms" body for the Terms & Legal card. */
  body: string;
}

/** The proposal fields the category resolution depends on. */
export interface PaymentTermsSource {
  service_type?: string | null;
  facility_details?: unknown;
  service_specific_data?: unknown;
  property_type?: string | null;
}

const LATE_BALANCES =
  'Late balances may incur a finance charge of 1.5% per month or the maximum allowed by law.';

const TERMS_BY_CATEGORY: Record<ServiceCategory, PaymentTerms> = {
  commercial: {
    label: 'Net 30',
    description: 'Payment is due within 30 days of the invoice date.',
    body: [
      'Invoices are issued monthly in advance unless otherwise agreed in writing.',
      'Payment terms are Net 30.',
      'Payment is due within 30 days of the invoice date.',
      LATE_BALANCES,
    ].join(' '),
  },
  residential: {
    label: 'Due Upon Completion',
    description: 'Payment is due upon completion of service.',
    body: [
      'An invoice is issued when the service visit is complete.',
      'Payment terms are Due Upon Completion.',
      'Payment is due upon completion of service.',
      LATE_BALANCES,
    ].join(' '),
  },
};

/**
 * Building types that mean "somebody's home".
 *
 * Multi-unit properties are deliberately absent: apartment, condo and townhouse
 * work is common-area janitorial, which `BUILDING_TYPE_TO_SCOPE` in
 * `resolve-template-images.ts` already classifies as commercial. They bill Net 30.
 */
const RESIDENTIAL_BUILDING_TYPES = new Set(['house', 'residential']);

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function isResidentialBuilding(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    RESIDENTIAL_BUILDING_TYPES.has(value.trim().toLowerCase())
  );
}

/**
 * The category a proposal bills under.
 *
 * `service_type` is the direct signal, but the quick flow derives it from the
 * scope rather than the property: a house getting floor care is saved as
 * `service_type: 'floor'`. So for the add-on types we fall back to the building
 * type. Anything unrecognized bills commercial, so terms are never blank.
 */
export function resolveServiceCategory(
  source: PaymentTermsSource
): ServiceCategory {
  const serviceType = source.service_type?.trim().toLowerCase();
  if (serviceType === 'residential') return 'residential';
  if (serviceType === 'commercial') return 'commercial';

  const serviceSpecific = readRecord(source.service_specific_data);
  const candidates = [
    readRecord(source.facility_details).building_type,
    serviceSpecific.property_type,
    source.property_type,
  ];

  return candidates.some(isResidentialBuilding) ? 'residential' : 'commercial';
}

/** Payment terms for a proposal. Never throws; never returns empty text. */
export function resolvePaymentTerms(source: PaymentTermsSource): PaymentTerms {
  return TERMS_BY_CATEGORY[resolveServiceCategory(source)];
}
