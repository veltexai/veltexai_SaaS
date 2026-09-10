#!/usr/bin/env node
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { spawnSync } from "child_process";
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.info("100S supervised social operator\n\n  pnpm 100s:operator -- --mode=dry-run\n  pnpm 100s:operator -- --mode=fixture-preview\n\nNo network calls, credentials, writes, scheduling, publishing, or replies are supported.");
  process.exit(0);
}
const buildDirectory = mkdtempSync(join(tmpdir(), "veltex-100s-operator-"));
try {
  const compile = spawnSync("pnpm", ["exec", "tsc", "--module", "commonjs", "--moduleResolution", "node", "--target", "ES2022", "--esModuleInterop", "--resolveJsonModule", "--skipLibCheck", "--outDir", buildDirectory, "100X/100S/operator/entry.ts"], { cwd: process.cwd(), stdio: "inherit" });
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else { const execution = spawnSync(process.execPath, [resolve(buildDirectory, "operator/entry.js"), ...process.argv.slice(2)], { cwd: process.cwd(), stdio: "inherit" }); process.exitCode = execution.status ?? 1; }
} finally { rmSync(buildDirectory, { recursive: true, force: true }); }
