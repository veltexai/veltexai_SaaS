import { Database } from "@/types/database";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

export interface SendModalProposal {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  client_company: string | undefined;
  service_type: "residential" | "commercial" | "carpet" | "window" | "floor";
  status: "draft" | "sent" | "accepted" | "rejected";
}

export function toSendModalProposal(proposal: Proposal): SendModalProposal {
  return {
    id: proposal.id,
    title: proposal.title,
    client_name: proposal.client_name,
    client_email: proposal.client_email,
    client_company: proposal.client_company ?? undefined,
    service_type: proposal.service_type,
    status: proposal.status,
  };
}
