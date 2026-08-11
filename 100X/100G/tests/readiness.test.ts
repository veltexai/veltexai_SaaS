import { readProductionStageReadiness } from "../src/readiness";

const jwt = (role: string, exp: number) => `x.${Buffer.from(JSON.stringify({ role, exp })).toString("base64url")}.x`;

function configured(exp: number): Record<string, string> {
  const env: Record<string, string> = { VELTEX_100G_EXECUTE_STAGES: "false" };
  for (const stage of ["100A", "100B", "100C"]) {
    env[`VELTEX_${stage}_SUPABASE_URL`] = "https://example.supabase.co";
    env[`VELTEX_${stage}_SUPABASE_ANON_KEY`] = "anon";
    env[`VELTEX_${stage}_WORKER_JWT`] = jwt(`veltex_${stage.toLowerCase()}_worker`, exp);
    env[`VELTEX_${stage}_ALLOW_100G`] = "false";
  }
  env.VELTEX_100A_GOOGLE_PLACES_API_KEY = "google";
  env.VELTEX_100B_APOLLO_API_KEY = "apollo";
  env.VELTEX_100C_INSTANTLY_API_KEY = "instantly";
  env.VELTEX_100C_CAMPAIGN_CONFIG_ID = "campaign";
  env.VELTEX_100C_ENVIRONMENT_ID = "pilot";
  return env;
}

describe("100G production-stage readiness", () => {
  it("reports configured credentials without making providers eligible", () => {
    const readiness = readProductionStageReadiness(configured(2_000_000_000), new Date("2026-08-11T00:00:00Z"));
    expect(readiness.ok).toBe(true);
    expect(readiness.providerCallsMade).toBe(false);
    expect(readiness.executionGate).toBe(false);
    expect(readiness.stages.every(({ configured }) => configured)).toBe(true);
    expect(readiness.stages.every(({ gates }) => !gates.orchestrationEnabled)).toBe(true);
  });

  it("fails closed for a missing credential or expired worker", () => {
    const env = configured(1);
    delete env.VELTEX_100B_APOLLO_API_KEY;
    const readiness = readProductionStageReadiness(env, new Date("2026-08-11T00:00:00Z"));
    expect(readiness.ok).toBe(false);
    expect(readiness.stages.find(({ stage }) => stage === "100B")?.missing).toEqual(["VELTEX_100B_APOLLO_API_KEY"]);
    expect(readiness.stages.every(({ worker }) => !worker.valid)).toBe(true);
  });
});
