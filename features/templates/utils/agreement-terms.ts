import {
  isOneTimeResidential,
  type ProposalServiceSource,
} from "./proposal-service-context";

export interface AgreementTerms {
  title: string;
  description: string;
}

const RECURRING_TERMS: AgreementTerms = {
  title: "Terms & Renewal",
  description:
    "This agreement shall commence on the service start date and remain in effect for an initial term of twelve (12) months. Thereafter, services will continue on a month-to-month basis unless terminated by either party with thirty (30) days written notice.",
};

const ONE_TIME_RESIDENTIAL_TERMS: AgreementTerms = {
  title: "One-Time Service",
  description:
    "This proposal covers one residential service visit on the agreed service date. It does not create a recurring service commitment or renew automatically.",
};

export function resolveAgreementTerms(
  source: ProposalServiceSource,
): AgreementTerms {
  return isOneTimeResidential(source)
    ? ONE_TIME_RESIDENTIAL_TERMS
    : RECURRING_TERMS;
}
