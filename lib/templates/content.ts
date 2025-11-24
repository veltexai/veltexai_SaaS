import { type ReactNode, createElement } from 'react';
import {
  DisputIcon,
  DocumentIcon,
  InsuranceIcon,
  paymentcardIcon,
  secureIcon,
  staffIcon,
  suplliseIcon,
} from '../../components/icons/veltex-icons';

export type TocItem = { id: string; number: string; title: string };
export type TermItem = {
  id: number;
  icons?: ReactNode;
  title: string;
  description: string;
};

const BASE_TOC: ReadonlyArray<Omit<TocItem, 'number'>> = [
  { id: 'about-our-company', title: 'About Our Company' },
  { id: 'our-commitment', title: 'Our Commitment' },
  { id: 'why-choose-us', title: 'Why Choose Us' },
  { id: 'our-qualifications', title: 'Our Qualifications' },
  { id: 'scope-of-work', title: 'Scope of Work' },
  { id: 'service-quote-pricing', title: 'Service Quote & Pricing' },
  { id: 'terms-legal', title: 'Terms & Legal' },
  { id: 'proposal-acceptance', title: 'Proposal Acceptance' },
  { id: 'thank-you-contact', title: 'Thank You / Contact' },
];

const MANUAL_TOC_NUMBERS: Record<string, string> = {
  'our-commitment': '04',
  'why-choose-us': '04',
};

export const dataTOC: ReadonlyArray<TocItem> = (() => {
  let current = 2;
  return BASE_TOC.map((item) => {
    const manual = MANUAL_TOC_NUMBERS[item.id];
    if (manual) {
      current = parseInt(manual, 10);
      return { ...item, number: manual };
    }
    current += 1;
    return { ...item, number: String(current).padStart(2, '0') };
  });
})();

export const dataTerms: ReadonlyArray<TermItem> = [
  {
    id: 1,
    icons: createElement(DocumentIcon),
    title: 'Terms & Renewal',
    description:
      'Initial term [12 months] with automatic month-to-month renewal unless terminated with [30 days] written notice.',
  },
  {
    id: 2,
    icons: createElement(paymentcardIcon),
    title: 'Payment',
    description:
      'Invoices are due per selected terms: [Due at service | Net 15 | Net 30]. Late balances may incur [1.5%/mo] finance charges.',
  },
  {
    id: 3,
    icons: createElement(suplliseIcon),
    title: 'Supplies & Consumables',
    description:
      'Consumables (paper goods, soap, liners) provided by [Client | Contractor]. If Contractor-provided, costs are billed monthly.',
  },
  {
    id: 4,
    icons: createElement(secureIcon),
    title: 'Access & Security',
    description:
      'Client will provide safe access (keys, codes, badges). Contractor safeguards credentials and follows site protocols',
  },
  {
    id: 5,
    icons: createElement(InsuranceIcon),
    title: 'Insurance & Liability',
    description:
      'Contractor maintains liability and workers’ compensation insurance. Contractor is not liable for pre-existing damage or unsecured valuables.',
  },
  {
    id: 6,
    icons: createElement(staffIcon),
    title: 'Staffing',
    description:
      'All personnel are background-checked and trained. Non-solicitation of staff during the agreement term and [12 months] thereafter.',
  },
  {
    id: 7,
    icons: createElement(DisputIcon),
    title: 'Dispute Resolution',
    description:
      'Disputes resolved via [mediation | arbitration | court] under the laws of [Jurisdiction].',
  },
];
