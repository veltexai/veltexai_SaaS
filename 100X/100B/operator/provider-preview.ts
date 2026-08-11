import { readFileSync } from "fs";
import { resolve } from "path";
import type { CompanyContext } from "../src/types";

// Provider-preview target binding. Provider-preview must run against APPROVED REAL 100A company
// records (real domains) — never the synthetic example.com fixture companies. This module loads and
// validates the approved target file so the binding is testable without constructing any client.
//
// A live Apollo provider-preview reads real public businesses. This file carries ONLY nonsecret
// public-business identifiers (name, website, normalized domain, type, eligibility). It never
// carries contacts, emails, phones, Apollo ids/responses, API keys, JWTs, or Supabase keys.

export interface ProviderPreviewCompany extends CompanyContext {
  website?: string; // public company website (nonsecret); domain is the normalized host
}
export interface ProviderPreviewTargetFile {
  prospectIds: string[];
  companies: ProviderPreviewCompany[];
}

const RESERVED_EXAMPLE = /(^|\.)example\.(com|org|net)$/i;

export function loadProviderPreviewTargets(read: (name: string) => string = defaultRead): ProviderPreviewTargetFile {
  const raw = JSON.parse(read("provider-preview-targets.json")) as Partial<ProviderPreviewTargetFile>;
  const companies = Array.isArray(raw.companies) ? raw.companies : [];
  const prospectIds = Array.isArray(raw.prospectIds) ? raw.prospectIds : [];
  if (companies.length === 0) throw new Error("provider-preview targets file has no approved companies");
  for (const company of companies) {
    if (!company.prospectId || !company.websiteDomain) throw new Error("provider-preview target is missing a prospectId or websiteDomain");
    // Guard against accidentally binding provider-preview to synthetic fixture domains.
    if (RESERVED_EXAMPLE.test(company.websiteDomain)) {
      throw new Error(`provider-preview target ${company.prospectId} uses a reserved example domain; real 100A domains are required`);
    }
  }
  return { prospectIds, companies };
}

// Select the approved companies for the requested prospect IDs, failing closed (throwing) on any id
// that is not in the approved target file. When no ids are requested, all approved targets are used.
// Call this BEFORE constructing any Apollo client.
export function selectApprovedTargets(targets: ProviderPreviewTargetFile, requestedIds: string[]): { companies: ProviderPreviewCompany[]; prospectIds: string[] } {
  const byId = new Map(targets.companies.map((c) => [c.prospectId, c]));
  const requested = requestedIds.length > 0 ? requestedIds : targets.prospectIds;
  for (const id of requested) {
    if (!byId.has(id)) throw new Error(`prospect ${id} is not in the approved provider-preview targets`);
  }
  return { companies: requested.map((id) => byId.get(id)!), prospectIds: requested };
}

function defaultRead(name: string): string {
  return readFileSync(resolve(process.cwd(), `100X/100B/operator/${name}`), "utf8");
}
