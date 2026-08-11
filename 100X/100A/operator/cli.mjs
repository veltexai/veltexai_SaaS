#!/usr/bin/env node
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const help = `100A operator command (terminal only)

True dry run (validation and plan only; zero external clients/calls/writes):
  pnpm 100a:operator -- --mode=dry-run --geography=<approved-id> --target=<approved-environment>

Google preview (Google quota may be consumed; in-memory repository only):
  pnpm 100a:operator -- --mode=google-preview --geography=<approved-id> --target=<approved-environment>

Controlled write (Google read + dedicated 100A worker role):
  pnpm 100a:operator -- --mode=write --geography=<approved-id> --target=<approved-pilot-environment> \\
    --confirm-target=<approved-pilot-environment> --confirm-writes=WRITE_MAX_5

The geography and nonproduction environment must be approved with references in operator/*.json.
Production is unconditionally prohibited. Plans display credential presence only and never secret values.
No route, webhook, cron, browser command, or schedule is provided.`;
if (process.argv.includes("--help") || process.argv.includes("-h")) { console.info(help); process.exit(0); }

const buildDirectory = mkdtempSync(join(tmpdir(), "veltex-100a-operator-"));
try {
  const compile = spawnSync("pnpm", ["exec", "tsc", "--module", "commonjs", "--moduleResolution", "node", "--target", "ES2022", "--esModuleInterop", "--resolveJsonModule", "--skipLibCheck", "--outDir", buildDirectory, "100X/100A/operator/entry.ts"], { cwd: process.cwd(), stdio: "inherit" });
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
