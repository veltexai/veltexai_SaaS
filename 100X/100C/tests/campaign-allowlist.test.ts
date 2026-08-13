import { assertCampaignStateSafe, assertWorkspaceAllowed, selectApprovedCampaign } from "../src/campaign-allowlist";
import type { ApprovedCampaign, CampaignState } from "../src/types";

const approved: ApprovedCampaign = {
  configId: "cfg1", instantlyCampaignId: "11111111-1111-4111-8111-111111111111", label: "Pilot", segment: "seg",
  environment: "100c-pilot", approved: true, approvalReference: "REF-1", expectedWorkspaceId: "ws-1",
  allowedStates: ["draft", "paused"], dailySyncCap: 1, totalPilotCap: 1, active: true,
};

describe("100C campaign allowlist", () => {
  it("selects an approved, active, environment-bound campaign", () => {
    expect(selectApprovedCampaign("cfg1", [approved], "100c-pilot").configId).toBe("cfg1");
  });
  it("rejects an unapproved campaign id (not in allowlist)", () => {
    expect(() => selectApprovedCampaign("nope", [approved], "100c-pilot")).toThrow(/not in the approved allowlist/);
  });
  it("rejects an unapproved or disabled or placeholder campaign", () => {
    expect(() => selectApprovedCampaign("cfg1", [{ ...approved, approved: false }], "100c-pilot")).toThrow(/not approved/);
    expect(() => selectApprovedCampaign("cfg1", [{ ...approved, active: false }], "100c-pilot")).toThrow(/disabled/);
    expect(() => selectApprovedCampaign("cfg1", [{ ...approved, instantlyCampaignId: null }], "100c-pilot")).toThrow(/no approved Instantly campaign id/);
  });
  it("rejects a campaign bound to a different environment", () => {
    expect(() => selectApprovedCampaign("cfg1", [approved], "other-env")).toThrow(/not bound to the approved environment/);
  });

  it("accepts Draft and Paused campaign states for the pilot", () => {
    expect(() => assertCampaignStateSafe(approved, "draft")).not.toThrow();
    expect(() => assertCampaignStateSafe(approved, "paused")).not.toThrow();
  });
  it.each<CampaignState>(["active", "completed", "running_subsequences", "accounts_unhealthy", "bounce_protect", "account_suspended", "unknown"])(
    "fails closed on a non-pilot-safe state: %s", (state) => {
      expect(() => assertCampaignStateSafe(approved, state)).toThrow();
    });
  it("rejects an allowlist that itself permits a non-pilot-safe state", () => {
    expect(() => assertCampaignStateSafe({ ...approved, allowedStates: ["active"] as CampaignState[] }, "active")).toThrow();
  });
  it("permits an active campaign only with explicit live-sync authorization", () => {
    const live = { ...approved, allowedStates: ["active"] as CampaignState[] };
    expect(() => assertCampaignStateSafe(live, "active")).toThrow(/explicit authorization/);
    expect(() => assertCampaignStateSafe(live, "active", true)).not.toThrow();
  });
  it("permits a completed campaign only with explicit continuity authorization", () => {
    const completed = { ...approved, allowedStates: ["completed"] as CampaignState[] };
    expect(() => assertCampaignStateSafe(completed, "completed", false, false)).toThrow(/reactivation requires explicit authorization/);
    expect(() => assertCampaignStateSafe(completed, "completed", false, true)).not.toThrow();
  });
  it("rejects a mismatched Instantly workspace", () => {
    expect(() => assertWorkspaceAllowed(approved, "ws-2")).toThrow(/workspace does not match/);
    expect(() => assertWorkspaceAllowed(approved, "ws-1")).not.toThrow();
  });
});
