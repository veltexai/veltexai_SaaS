import { readFileSync } from "fs";
import { resolve } from "path";
import { executeOperator, type FixtureFile } from "./runtime";
import { toAllowlist } from "./command";

// Non-live entrypoint. Reads the authoritative allowlist from 100C's approved campaigns and the 100D
// offline fixtures. Constructs no external client and performs no network or database call.
const readJson = <T>(path: string): T => JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as T;

const campaignsFile = readJson<{ campaigns?: Array<Record<string, unknown>> }>("100X/100C/operator/campaigns.json");
const campaigns = toAllowlist(campaignsFile);
const loadFixture = (): FixtureFile => readJson<FixtureFile>("100X/100D/operator/fixtures.json");

const output = { info: (record: Record<string, unknown>) => console.info(JSON.stringify(record)) };

executeOperator(process.argv.slice(2), process.env, campaigns, loadFixture, output).catch((error) => {
  console.error(JSON.stringify({ event: "operator.failed", message: error instanceof Error ? error.message : "unknown error" }));
  process.exitCode = 1;
});
