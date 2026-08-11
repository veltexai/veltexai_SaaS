import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const secret = crypto.randomBytes(32).toString("base64url");
const result = spawnSync("security", ["add-generic-password", "-U", "-s", "veltex-100f-cron-secret", "-a", process.env.USER, "-w", secret], { stdio: "ignore" });
if (result.status !== 0) {
  console.error("Keychain store failed.");
  process.exit(1);
}
console.log("stored veltex-100f-cron-secret");
