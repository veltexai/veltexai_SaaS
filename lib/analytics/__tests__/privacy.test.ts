import { readFileSync } from "fs";
import { join } from "path";

describe("PostHog privacy guardrails", () => {
  const instrumentation = readFileSync(
    join(process.cwd(), "instrumentation-client.ts"),
    "utf8",
  );
  const eventTypes = readFileSync(
    join(process.cwd(), "lib/analytics/types.ts"),
    "utf8",
  );

  it("disables generic capture and masks replay input and URLs", () => {
    expect(instrumentation).toContain("autocapture: false");
    expect(instrumentation).toContain("capture_pageview: false");
    expect(instrumentation).toContain("maskAllInputs: true");
    expect(instrumentation).toContain('maskTextSelector: ".ph-no-capture"');
    expect(instrumentation).toContain('request.name.split("?")[0]');
    expect(instrumentation).toContain("recordHeaders: false");
    expect(instrumentation).toContain("recordBody: false");
  });

  it("does not allow sensitive proposal or customer fields in event types", () => {
    for (const sensitiveName of [
      "client_name",
      "client_email",
      "client_phone",
      "service_location",
      "generated_content",
      "prompt",
      "access_token",
      "refresh_token",
    ]) {
      expect(eventTypes).not.toContain(sensitiveName);
    }
  });
});
