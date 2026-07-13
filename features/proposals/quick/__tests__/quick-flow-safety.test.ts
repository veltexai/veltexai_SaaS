import { readFileSync } from "fs";
import { join } from "path";

const quickFlowPath = join(
  process.cwd(),
  "features/proposals/quick/components/quick-proposal-flow.tsx",
);
const quickFlowSource = readFileSync(quickFlowPath, "utf8");

describe("quick proposal C6B safety", () => {
  it("calls the generate endpoint from the quick flow", () => {
    expect(quickFlowSource).toContain('fetch("/api/proposals/generate"');
  });

  it("uses the existing proposal save endpoint from the quick flow", () => {
    expect(quickFlowSource).toContain('fetch("/api/proposals",');
  });

  it("keeps generate and save as separate actions", () => {
    expect(quickFlowSource).toContain("generateProposalPreview");
    expect(quickFlowSource).toContain("saveGeneratedProposal");
    expect(quickFlowSource.indexOf("saveGeneratedProposal")).toBeGreaterThan(
      quickFlowSource.indexOf("generateProposalPreview"),
    );
  });

  it("does not change trial usage from the quick flow", () => {
    expect(quickFlowSource).not.toContain("increment_user_usage");
    expect(quickFlowSource).not.toContain("usage");
    expect(quickFlowSource).not.toContain("trial");
  });

  it("does not introduce activation, proposal event, billing, or tracking references", () => {
    expect(quickFlowSource).not.toContain("activation_events");
    expect(quickFlowSource).not.toContain("proposal_events");
    expect(quickFlowSource).not.toContain("PricingEngine");
    expect(quickFlowSource).not.toContain("stripe");
    expect(quickFlowSource).not.toContain("download");
  });
});
