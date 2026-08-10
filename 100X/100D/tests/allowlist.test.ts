import { matchApprovedCampaign, type AllowlistCampaign } from "../src/allowlist";

const WS = "698b2090-f4d5-484b-a0b1-44016fee7515";
const CID = "c01e55de-f1c8-4a0c-9817-13fe7456ab66";
const approved: AllowlistCampaign[] = [
  { configId: "veltex-100c-pilot-no-send", instantlyCampaignId: CID, expectedWorkspaceId: WS, approved: true, active: true },
];

describe("100D workspace + campaign allowlisting", () => {
  it("accepts the approved workspace + campaign", () => {
    const r = matchApprovedCampaign(WS, CID, approved);
    expect(r.ok).toBe(true);
    expect(r.campaignConfigId).toBe("veltex-100c-pilot-no-send");
  });
  it("rejects a wrong workspace", () => {
    expect(matchApprovedCampaign("00000000-0000-4000-8000-000000000999", CID, approved).ok).toBe(false);
  });
  it("rejects a missing workspace", () => {
    expect(matchApprovedCampaign(null, CID, approved).ok).toBe(false);
    expect(matchApprovedCampaign("  ", CID, approved).ok).toBe(false);
  });
  it("rejects a wrong campaign", () => {
    expect(matchApprovedCampaign(WS, "11111111-1111-4111-8111-111111111111", approved).ok).toBe(false);
  });
  it("rejects a missing campaign", () => {
    expect(matchApprovedCampaign(WS, null, approved).ok).toBe(false);
    expect(matchApprovedCampaign(WS, "", approved).ok).toBe(false);
  });
  it("rejects an unapproved / inactive campaign even if ids match", () => {
    const notApproved = [{ ...approved[0], approved: false }];
    const inactive = [{ ...approved[0], active: false }];
    expect(matchApprovedCampaign(WS, CID, notApproved).ok).toBe(false);
    expect(matchApprovedCampaign(WS, CID, inactive).ok).toBe(false);
  });
  it("rejects when the approved campaign has no pinned workspace", () => {
    const noWs = [{ ...approved[0], expectedWorkspaceId: null }];
    expect(matchApprovedCampaign(WS, CID, noWs).ok).toBe(false);
  });
});
