import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { GooglePlacesTextSearchClient } from "../src/google-places";
import { SupabaseDiagnosticSink, SupabaseProspectRepository } from "../src/supabase-adapters";
import type { ApprovedEnvironment, ApprovedGeography } from "./command";
import { executeOperator } from "./runtime";

const readJson = <T>(name: string): T => JSON.parse(readFileSync(resolve(process.cwd(), `100X/100A/operator/${name}`), "utf8")) as T;
const output = { info: (record: Record<string, unknown>) => console.info(JSON.stringify(record)) };

executeOperator(
  process.argv.slice(2), process.env,
  readJson<ApprovedGeography[]>("geographies.json"), readJson<ApprovedEnvironment[]>("environments.json"),
  {
    createGoogle: (apiKey) => new GooglePlacesTextSearchClient(apiKey, fetch, { maxRequestsPerSearch: 3 }),
    createSupabase: (env) => {
      const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${env.SUPABASE_100A_WORKER_JWT!}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      return { repository: new SupabaseProspectRepository(client), diagnostics: new SupabaseDiagnosticSink(client) };
    },
  }, output,
).catch((error) => {
  console.error(JSON.stringify({ event: "operator.failed", message: error instanceof Error ? error.message : "unknown error" }));
  process.exitCode = 1;
});
