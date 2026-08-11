#!/usr/bin/env node
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const help = `100B contact-enrichment operator command (terminal only)

True dry run (validation and plan only; zero external clients/calls/writes):
  pnpm 100b:operator -- --mode=dry-run --target=<approved-environment>

Fixture preview (offline fixtures + in-memory storage; zero external calls):
  pnpm 100b:operator -- --mode=fixture-preview --target=<approved-environment>

Provider preview (live provider reads; in-memory only; Supabase disabled):
  pnpm 100b:operator -- --mode=provider-preview --provider=apollo --target=<approved-environment> --prospects=<id,id>

Controlled write (capped pilot contact writes into the isolated environment):
  pnpm 100b:operator -- --mode=controlled-write --provider=fixture --target=<approved-pilot-environment> \\
    --prospects=<id,id> --confirm-target=<approved-pilot-environment> --confirm-writes=CONTACTS_MAX_10

The nonproduction environment must be approved with a reference in operator/environments.json.
Production is unconditionally prohibited. Plans display credential presence only, never secret values.
No Instantly, email, HubSpot, Data Axle, route, webhook, cron, browser command, or schedule is provided.`;
if (process.argv.includes("--help") || process.argv.includes("-h")) { console.info(help); process.exit(0); }

const buildDirectory = mkdtempSync(join(tmpdir(), "veltex-100b-operator-"));
try {
  const compile = spawnSync("pnpm", ["exec", "tsc", "--module", "commonjs", "--moduleResolution", "node", "--target", "ES2022", "--esModuleInterop", "--resolveJsonModule", "--skipLibCheck", "--outDir", buildDirectory, "100X/100B/operator/entry.ts"], { cwd: process.cwd(), stdio: "inherit" });
  if (compile.status !== 0) {
    process.exitCode = compile.status ?? 1;
  } else {
    const entry = resolve(buildDirectory, "operator/entry.js");
    const execution = spawnSync(process.execPath, [entry, ...process.argv.slice(2)], { cwd: process.cwd(), env: { ...process.env, NODE_PATH: resolve(process.cwd(), "node_modules") }, stdio: "inherit" });
    process.exitCode = execution.status ?? 1;
  }
} finally {
  rmSync(buildDirectory, { recursive: true, force: true });
}
