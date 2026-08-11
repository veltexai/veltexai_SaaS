import { readFileSync } from "fs";
import { resolve } from "path";
import { selectApprovedCampaign } from "../src/campaign-allowlist";
import type { ApprovedCampaign } from "../src/types";

// Loads the campaign allowlist and selects the approved campaign for a config id, failing closed on
// anything not approved/active/bound. Testable without constructing any client.
export function loadApprovedCampaigns(read: (name: string) => string = defaultRead): ApprovedCampaign[] {
  const raw = JSON.parse(read("campaigns.json"));
  const campaigns = Array.isArray(raw?.campaigns) ? raw.campaigns : [];
  return campaigns as ApprovedCampaign[];
}
export function bindApprovedCampaign(configId: string, environmentId: string, read: (name: string) => string = defaultRead): ApprovedCampaign {
  return selectApprovedCampaign(configId, loadApprovedCampaigns(read), environmentId);
}
function defaultRead(name: string): string { return readFileSync(resolve(process.cwd(), `100X/100C/operator/${name}`), "utf8"); }
