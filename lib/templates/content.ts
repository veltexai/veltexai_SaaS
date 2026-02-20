import { type ReactNode, createElement } from "react";
import {
  DisputIcon,
  DocumentIcon,
  InsuranceIcon,
  paymentcardIcon,
  secureIcon,
  SettingsIcon,
  staffIcon,
  StartIcon,
  suplliseIcon,
} from "../../components/icons/veltex-icons";

export type TocItem = { id: string; number: string; title: string };
export type TermItem = {
  id: number;
  icons?: ReactNode;
  title: string;
  description: string;
};

const BASE_TOC: ReadonlyArray<Omit<TocItem, "number">> = [
  { id: "about-our-company", title: "About Our Company" },
  { id: "our-commitment", title: "Our Commitment" },
  { id: "why-choose-us", title: "Why Choose Us" },
  { id: "our-qualifications", title: "Our Qualifications" },
  { id: "scope-of-work", title: "Scope of Work" },
  { id: "service-quote-pricing", title: "Service Quote & Pricing" },
  { id: "terms-legal", title: "Terms & Legal" },
  { id: "proposal-acceptance", title: "Proposal Acceptance" },
  { id: "thank-you-contact", title: "Thank You / Contact" },
];

const MANUAL_TOC_NUMBERS: Record<string, string> = {
  "our-commitment": "04",
  "why-choose-us": "04",
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
    return { ...item, number: String(current).padStart(2, "0") };
  });
})();

export const dataTerms: ReadonlyArray<TermItem> = [
  {
    id: 1,
    icons: createElement(DocumentIcon),
    title: "Terms & Renewal",
    description:
      "This agreement shall commence on the service start date and remain in effect for an initial term of twelve (12) months. Thereafter, services will continue on a month-to-month basis unless terminated by either party with thirty (30) days written notice.",
  },
  {
    id: 2,
    icons: createElement(paymentcardIcon),
    title: "Billing & Payment Terms",
    description:
      "invoices are issued monthly in advance unless otherwise agreed in writing. Payment is due within the selected terms (Due Upon Receipt, Net 15, or Net 30). Late balances may incur a finance charge of 1.5% per month or the maximum allowed by law. Invoices are issued monthly in advance. The initial invoice is due upon contract execution or prior to service commencement. Thereafter, payment terms are Net 30 from invoice date.",
  },
  {
    id: 3,
    icons: createElement(StartIcon),
    title: "Scope Modifications",
    description:
      "Any changes to service scope, frequency, or facility conditions that materially affect labor or operational requirements may require written adjustment to pricing.",
  },
  {
    id: 4,
    icons: createElement(suplliseIcon),
    title: "Supplies & Consumables",
    description:
      "Unless otherwise specified, consumable supplies (paper products, liners, soap) shall be provided by the Client. If supplied by Contractor, such costs will be invoiced monthly at agreed rates.",
  },
  {
    id: 5,
    icons: createElement(secureIcon),
    title: "Access & Security",
    description:
      "Client agrees to provide safe and reasonable access to the facility. Contractor will safeguard all keys, codes, and credentials and adhere to site-specific security protocols.",
  },
  {
    id: 6,
    icons: createElement(InsuranceIcon),
    title: "Insurance & Liability",
    description:
      "Contractor maintains general liability and workers’ compensation insurance in accordance with applicable regulations. Certificates of insurance are available upon request. Contractor shall not be liable for pre-existing damage, unsecured valuables, or conditions beyond its control. Coverage limits meet or exceed industry standards for commercial facilities.",
  },
  {
    id: 7,
    icons: createElement(staffIcon),
    title: "Staffing & Non-Solicitation",
    description:
      "All personnel are background-checked and trained. Client agrees not to directly solicit or hire Contractor employees during the agreement term and for twelve (12) months thereafter without written consent.",
  },
  {
    id: 8,
    icons: createElement(DisputIcon),
    title: "Dispute Resolution",
    description:
      "Disputes shall first be addressed through good-faith negotiation. If unresolved, parties agree to mediation prior to litigation, under the governing laws of the state in which services are performed.",
  },
];
