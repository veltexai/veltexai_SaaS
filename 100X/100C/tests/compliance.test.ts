import { assertOutboundComplianceReady, loadOutboundCompliance } from "../src/compliance";

const good = {
  VELTEX_100C_COMPLIANCE_APPROVED: "true",
  VELTEX_100C_SENDER_NAME: "Veltex AI",
  VELTEX_100C_FROM_EMAIL: "hello@veltexai.com",
  VELTEX_100C_REPLY_TO: "hello@veltexai.com",
  VELTEX_100C_POSTAL_ADDRESS: "123 Main Street, City, ST 00000",
  VELTEX_100C_UNSUBSCRIBE_URL: "https://www.veltexai.com/unsubscribe",
  VELTEX_100C_SPF_DKIM_DMARC_VERIFIED: "true",
  VELTEX_100C_ONE_CLICK_UNSUBSCRIBE_VERIFIED: "true",
};

describe("100C outbound compliance gate", () => {
  it("accepts a complete approved configuration", () => {
    expect(() => assertOutboundComplianceReady(loadOutboundCompliance(good))).not.toThrow();
  });

  it.each([
    ["approval", "VELTEX_100C_COMPLIANCE_APPROVED"],
    ["postal address", "VELTEX_100C_POSTAL_ADDRESS"],
    ["unsubscribe URL", "VELTEX_100C_UNSUBSCRIBE_URL"],
    ["domain authentication", "VELTEX_100C_SPF_DKIM_DMARC_VERIFIED"],
    ["one-click unsubscribe", "VELTEX_100C_ONE_CLICK_UNSUBSCRIBE_VERIFIED"],
  ])("fails closed when %s is missing", (_name, key) => {
    const env = { ...good, [key]: "" };
    expect(() => assertOutboundComplianceReady(loadOutboundCompliance(env))).toThrow();
  });
});
