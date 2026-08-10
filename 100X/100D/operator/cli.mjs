#!/usr/bin/env node
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const help = `100D Automated Suppression & Event Intelligence operator (terminal only, non-live)

All modes are OFFLINE: no webhook is registered, no endpoint is deployed, no real event is ingested,
no email is sent, no campaign is modified.

Dry run (validate config + allowlist; construct nothing, no DB, no call):
  pnpm 100d:operator -- --mode=dry-run

Fixture preview (synthetic events through the full pipeline, in-memory; zero external calls):
  pnpm 100d:operator -- --mode=fixture-preview

Local route test (exercise shared-secret auth + pipeline against synthetic request-like inputs; no server):
  pnpm 100d:operator -- --mode=local-route-test

Reconciliation preview (hold unmatched events, then reconcile after late assignments appear; offline):
  pnpm 100d:operator -- --mode=reconciliation-preview

Instantly API V2 only. The workspace + campaign must match the approved 100C allowlist
(100X/100C/operator/campaigns.json). Migration 004 is NOT applied by this tool. No secret value is ever
printed. Everything remains disabled and non-live.`;
if (process.argv.includes("--help") || process.argv.includes("-h")) { console.info(help); process.exit(0); }

const buildDirectory = mkdtempSync(join(tmpdir(), "veltex-100d-operator-"));
try {
  const compile = spawnSync("pnpm", ["exec", "tsc", "--module", "commonjs", "--moduleResolution", "node", "--target", "ES2022", "--esModuleInterop", "--resolveJsonModule", "--skipLibCheck", "--outDir", buildDirectory, "100X/100D/operator/entry.ts"], { cwd: process.cwd(), stdio: "inherit" });
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
