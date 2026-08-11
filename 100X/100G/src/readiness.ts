type Env = Record<string, string | undefined>;

const REQUIREMENTS = {
  "100A": ["VELTEX_100A_SUPABASE_URL", "VELTEX_100A_SUPABASE_ANON_KEY", "VELTEX_100A_WORKER_JWT", "VELTEX_100A_GOOGLE_PLACES_API_KEY"],
  "100B": ["VELTEX_100B_SUPABASE_URL", "VELTEX_100B_SUPABASE_ANON_KEY", "VELTEX_100B_WORKER_JWT", "VELTEX_100B_APOLLO_API_KEY"],
  "100C": ["VELTEX_100C_SUPABASE_URL", "VELTEX_100C_SUPABASE_ANON_KEY", "VELTEX_100C_WORKER_JWT", "VELTEX_100C_INSTANTLY_API_KEY", "VELTEX_100C_CAMPAIGN_CONFIG_ID", "VELTEX_100C_ENVIRONMENT_ID"],
} as const;

const WORKERS = {
  "100A": ["VELTEX_100A_WORKER_JWT", "veltex_100a_worker"],
  "100B": ["VELTEX_100B_WORKER_JWT", "veltex_100b_worker"],
  "100C": ["VELTEX_100C_WORKER_JWT", "veltex_100c_worker"],
} as const;

function inspectJwt(raw: string | undefined, expectedRole: string, nowSeconds: number): { valid: boolean; role: string | null; expiresAt: string | null } {
  try {
    const payload = JSON.parse(Buffer.from((raw ?? "").split(".")[1] ?? "", "base64url").toString("utf8")) as { role?: unknown; exp?: unknown };
    const role = typeof payload.role === "string" ? payload.role : null;
    const exp = typeof payload.exp === "number" ? payload.exp : 0;
    return { valid: role === expectedRole && exp > nowSeconds, role, expiresAt: exp > 0 ? new Date(exp * 1000).toISOString() : null };
  } catch {
    return { valid: false, role: null, expiresAt: null };
  }
}

export function readProductionStageReadiness(env: Env, now = new Date()) {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const stages = (Object.keys(REQUIREMENTS) as Array<keyof typeof REQUIREMENTS>).map((stage) => {
    const missing = REQUIREMENTS[stage].filter((name) => !env[name]?.trim());
    const [jwtName, expectedRole] = WORKERS[stage];
    const worker = inspectJwt(env[jwtName], expectedRole, nowSeconds);
    const orchestrationEnabled = env[`VELTEX_${stage}_ALLOW_100G`] === "true";
    const activeCampaignApproved = stage !== "100C" || env.VELTEX_100C_ALLOW_ACTIVE_CAMPAIGN === "true";
    return {
      stage,
      configured: missing.length === 0 && worker.valid,
      missing,
      worker,
      gates: { orchestrationEnabled, activeCampaignApproved },
    };
  });
  return {
    ok: stages.every(({ configured }) => configured),
    providerCallsMade: false,
    stages,
    executionGate: env.VELTEX_100G_EXECUTE_STAGES === "true",
  };
}
