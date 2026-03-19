import type { ProposalStatus, ServiceType } from "../types/proposal";

export type SendModalServiceType = `${ServiceType}`;

export type SendModalStatus = `${ProposalStatus}`;

type ProposalForSendModal = {
  id: string;
  title: string;
  client_name?: string | null;
  client_email?: string | null;
  client_company?: string | null;
  service_type: SendModalServiceType;
  status: SendModalStatus | ProposalStatus;
};

export interface SendModalProposal {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  client_company: string | undefined;
  service_type: SendModalServiceType;
  status: SendModalStatus;
}

export function toSendModalProposal(
  proposal: ProposalForSendModal,
): SendModalProposal {
  return {
    id: proposal.id,
    title: proposal.title,
    client_name: proposal.client_name ?? "",
    client_email: proposal.client_email ?? "",
    client_company: proposal.client_company ?? undefined,
    service_type: proposal.service_type,
    status: proposal.status as SendModalStatus,
  };
}
