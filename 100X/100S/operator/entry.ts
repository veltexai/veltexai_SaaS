import accounts from "./accounts.json";
import { buildLaunchBank, LAUNCH_INSIGHTS, US_BID_SMARTER_CAMPAIGN } from "../src";

const args = new Map(process.argv.slice(2).map((arg) => { const [key, ...rest] = arg.replace(/^--/, "").split("="); return [key, rest.join("=") || "true"]; }));
const mode = args.get("mode") ?? "dry-run";
if (!new Set(["dry-run", "fixture-preview"]).has(mode)) throw new Error("100S permits only dry-run or fixture-preview; publishing is not implemented");
if (accounts.publishingEnabled || accounts.commentReplyEnabled) throw new Error("Account configuration must remain inactive for the manual pilot");
const bank = buildLaunchBank(LAUNCH_INSIGHTS, US_BID_SMARTER_CAMPAIGN, new Date("2026-09-02T00:00:00.000Z"));
const report = {
  workflow: "100S", mode, externalCalls: 0, writes: 0, publishingEnabled: false,
  campaign: US_BID_SMARTER_CAMPAIGN.name, creativeUnits: bank.units.length, placements: bank.placements.length,
  series: [...new Set(bank.units.map((unit) => unit.seriesId))],
  platforms: Object.fromEntries(["facebook", "instagram", "linkedin", "youtube"].map((platform) => [platform, bank.placements.filter((placement) => placement.platform === platform).length])),
  compliance: { clean: bank.placements.filter((placement) => placement.compliance?.approved).length, blocked: bank.placements.filter((placement) => !placement.compliance?.approved).length },
  accounts: accounts.accounts.map((account) => ({ id: account.id, active: account.active, configured: Boolean(account.handle && account.providerAccountId) })),
};
console.log(JSON.stringify(mode === "fixture-preview" ? { ...report, preview: bank.placements.slice(0, 4) } : report, null, 2));
