#!/usr/bin/env node
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const help = `100C Instantly campaign-sync operator command (terminal only)

True dry run (validation and plan only; zero external clients/calls/writes):
  pnpm 100c:operator -- --mode=dry-run --target=<approved-environment>

Fixture preview (offline synthetic contacts + mock adapter + in-memory; zero external calls):
  pnpm 100c:operator -- --mode=fixture-preview --provider=fixture --target=<approved-environment>

Provider preview (READ-ONLY Instantly campaign inspection; no lead creation; Supabase disabled):
  pnpm 100c:operator -- --mode=provider-preview --provider=instantly --target=<approved-environment> --campaign=<approved-campaign>

Controlled write (capped pilot lead submission into an approved Draft/Paused campaign; disabled by default):
  pnpm 100c:operator -- --mode=controlled-write --provider=instantly --target=<approved-pilot-environment> \\
    --campaign=<approved-campaign> --confirm-target=<approved-pilot-environment> --confirm-campaign=<approved-campaign> --confirm-writes=LEADS_MAX_1

Instantly API V2 only. The environment and the campaign must be approved (operator/environments.json,
operator/campaigns.json). Production is unconditionally prohibited. Active and Completed states require
separate explicit deployment gates; unhealthy/unknown states fail closed. Plans display credential
presence only, never secret values. No campaign creation, arbitrary update, or direct email send.`;
if (process.argv.includes("--help") || process.argv.includes("-h")) { console.info(help); process.exit(0); }

const buildDirectory = mkdtempSync(join(tmpdir(), "veltex-100c-operator-"));
try {
  const compile = spawnSync("pnpm", ["exec", "tsc", "--module", "commonjs", "--moduleResolution", "node", "--target", "ES2022", "--esModuleInterop", "--resolveJsonModule", "--skipLibCheck", "--outDir", buildDirectory, "100X/100C/operator/entry.ts"], { cwd: process.cwd(), stdio: "inherit" });
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
