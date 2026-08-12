import { evaluateCompliancePreflight } from "../src/preflight";
import { loadOutboundCompliance } from "../src/compliance";

const env = {
  VELTEX_100C_COMPLIANCE_APPROVED: "true", VELTEX_100C_SENDER_NAME: "Veltex AI",
  VELTEX_100C_FROM_EMAIL: "hello@veltexai.com", VELTEX_100C_REPLY_TO: "hello@veltexai.com",
  VELTEX_100C_POSTAL_ADDRESS: "123 Main Street, City, ST 00000",
  VELTEX_100C_UNSUBSCRIBE_URL: "https://www.veltexai.com/unsubscribe",
  VELTEX_100C_SPF_DKIM_DMARC_VERIFIED: "true", VELTEX_100C_ONE_CLICK_UNSUBSCRIBE_VERIFIED: "true",
};

describe("compliance preflight", () => {
  it("passes a verified configuration", () => expect(evaluateCompliancePreflight(loadOutboundCompliance(env)).ok).toBe(true));
  it("blocks on a global pause", () => {
    const result = evaluateCompliancePreflight(loadOutboundCompliance(env), { globalSendPaused: true });
    expect(result.ok).toBe(false);
    expect(result.blockingReasons).toContain("global_send_pause");
  });
});
