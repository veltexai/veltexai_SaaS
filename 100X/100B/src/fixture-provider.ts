import type { CompanyContext, EnrichmentProvider, ProviderContactCandidate, ProviderEnrichmentResult } from "./types";

// Deterministic, offline provider for fixture-preview and tests. Makes NO external call.
// Optionally simulates provider errors/rate-limits per company for failure-path tests.
export class FixtureEnrichmentProvider implements EnrichmentProvider {
  readonly name = "fixture" as const;
  constructor(
    private readonly byProspect: Record<string, ProviderContactCandidate[]>,
    private readonly errors: Record<string, "throw" | "rate_limit"> = {},
  ) {}
  async enrichCompany(company: CompanyContext, _requestBudget: number): Promise<ProviderEnrichmentResult> {
    const mode = this.errors[company.prospectId];
    if (mode === "throw") throw new Error(`fixture provider error for ${company.prospectId}`);
    if (mode === "rate_limit") { const e = new Error("fixture rate limit"); (e as { kind?: string }).kind = "rate_limit"; throw e; }
    return { candidates: this.byProspect[company.prospectId] ?? [], requestsUsed: 1 };
  }
}
