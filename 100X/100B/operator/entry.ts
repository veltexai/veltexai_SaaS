import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { ApolloEnrichmentProvider } from "../src/apollo-provider";
import { FixtureEnrichmentProvider } from "../src/fixture-provider";
import { InMemorySuppressionResolver } from "../src/suppression";
import { SupabaseContactRepository, SupabaseDiagnosticSink } from "../src/supabase-adapters";
import type { CompanyContext, ProviderContactCandidate } from "../src/types";
import type { SuppressionSeed } from "../src/suppression";
import type { ApprovedEnvironment, OperatorPreflight } from "./command";
import { NullSuppressionResolver } from "../src/suppression";
import { executeOperator, type LocalContext } from "./runtime";
import { loadProviderPreviewTargets, selectApprovedTargets } from "./provider-preview";

interface FixtureFile { prospectIds: string[]; companies: CompanyContext[]; candidates: Record<string, ProviderContactCandidate[]>; suppression?: SuppressionSeed }
const readJson = <T>(name: string): T => JSON.parse(readFileSync(resolve(process.cwd(), `100X/100B/operator/${name}`), "utf8")) as T;
const output = { info: (record: Record<string, unknown>) => console.info(JSON.stringify(record)) };

// fixture-preview ONLY: synthetic offline fixtures (reserved example.com domains).
function fixtures(): FixtureFile { return readJson<FixtureFile>("enrichment-fixtures.json"); }
function fixtureContext(provider: LocalContext["provider"]): LocalContext {
  const f = fixtures();
  return { companies: f.companies, prospectIds: f.prospectIds, suppression: new InMemorySuppressionResolver(f.suppression ?? {}), provider };
}

executeOperator(
  process.argv.slice(2), process.env, readJson<ApprovedEnvironment[]>("environments.json"),
  {
    createFixtureContext: () => fixtureContext(new FixtureEnrichmentProvider(fixtures().candidates)),
    // provider-preview ONLY: APPROVED REAL 100A targets (real domains). Unknown prospect IDs fail
    // closed here, BEFORE any Apollo client is constructed.
    createProviderContext: (env, requestedProspectIds) => {
      const targets = loadProviderPreviewTargets();
      const { companies, prospectIds } = selectApprovedTargets(targets, requestedProspectIds);
      const provider = new ApolloEnrichmentProvider(env.APOLLO_API_KEY!, fetch);
      return { companies, prospectIds, suppression: new NullSuppressionResolver(), provider };
    },
    createControlledProvider: (preflight: OperatorPreflight, env) =>
      preflight.request.provider === "apollo"
        ? new ApolloEnrichmentProvider(env.APOLLO_API_KEY!, fetch)
        : new FixtureEnrichmentProvider(fixtures().candidates),
    createSupabase: (env) => {
      const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${env.SUPABASE_100B_WORKER_JWT!}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      return { repository: new SupabaseContactRepository(client), diagnostics: new SupabaseDiagnosticSink(client) };
    },
  }, output,
).catch((error) => {
  console.error(JSON.stringify({ event: "operator.failed", message: error instanceof Error ? error.message : "unknown error" }));
  process.exitCode = 1;
});
