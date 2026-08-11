import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const secret = process.env.SUPABASE_JWT_SECRET;
if (!secret) {
  console.error("SUPABASE_JWT_SECRET is missing.");
  process.exit(1);
}

const requestedTtl = Number.parseInt(process.env.VELTEX_100G_JWT_TTL_SECONDS ?? "2592000", 10);
const ttl = Number.isInteger(requestedTtl) && requestedTtl > 0 && requestedTtl <= 7_776_000 ? requestedTtl : 2_592_000;
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const iat = Math.floor(Date.now() / 1000);
const exp = iat + ttl;
const header = b64({ alg: "HS256", typ: "JWT" });
const payload = b64({ role: "veltex_100g_orchestrator_v2", iss: "supabase", ref: "wzpgbbwdqtpyfiojowdj", aud: "authenticated", iat, exp });
const data = `${header}.${payload}`;
const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
const jwt = `${data}.${signature}`;
const result = spawnSync("security", ["add-generic-password", "-U", "-s", "veltex-100g-orchestrator-v2-jwt", "-a", process.env.USER, "-w", jwt], { stdio: "ignore" });
if (result.status !== 0) {
  console.error("Keychain store failed.");
  process.exit(1);
}
console.log("stored veltex-100g-orchestrator-v2-jwt; expires", new Date(exp * 1000).toISOString());
