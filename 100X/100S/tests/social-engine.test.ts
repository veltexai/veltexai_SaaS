import { assertApprovalIsCurrent, auditDraft, buildLaunchBank, classifyEngagement, contentHash, evaluateCreative, evaluateFunnel, isApprovedDestination, LAUNCH_INSIGHTS, scheduleWeek, transitionDraft, US_BID_SMARTER_CAMPAIGN } from "../src";
import type { ContentDraft, PlacementMetricDaily } from "../src";

const bank = () => buildLaunchBank(LAUNCH_INSIGHTS, US_BID_SMARTER_CAMPAIGN, new Date("2026-09-02T00:00:00Z"));

describe("100S evidence, creative, and placement engine", () => {
  it("creates six distinct original units and twenty-four native placements", () => {
    const output = bank();
    expect(output.units).toHaveLength(6);
    expect(new Set(output.units.map((unit) => unit.seriesId)).size).toBe(6);
    expect(new Set(output.units.map((unit) => unit.script.hook)).size).toBe(6);
    expect(output.placements).toHaveLength(24);
    expect(output.placements.every((draft) => draft.compliance?.approved)).toBe(true);
    expect(output.placements.filter((draft) => draft.platform === "facebook").every((draft) => draft.format === "reel")).toBe(true);
    expect(output.placements.filter((draft) => draft.platform === "linkedin").every((draft) => draft.format === "native_video")).toBe(true);
  });

  it("uses deterministic idempotency keys", () => {
    expect(bank().placements.map((item) => item.idempotencyKey)).toEqual(bank().placements.map((item) => item.idempotencyKey));
    expect(new Set(bank().placements.map((item) => item.idempotencyKey)).size).toBe(24);
  });
});

describe("100S compliance gates", () => {
  it("audits spoken and on-screen video content", () => {
    const draft = bank().placements[0];
    const unsafe: ContentDraft = { ...draft, reel: { ...draft.reel!, scenes: draft.reel!.scenes.map((scene, index) => index ? scene : { ...scene, voiceover: "We guarantee profit" }) } };
    expect(auditDraft(unsafe, US_BID_SMARTER_CAMPAIGN).flags).toContain("unsupported-guarantee");
  });

  it("allows only approved HTTPS paths and UTM keys", () => {
    const valid = bank().placements[0].destinationUrl;
    expect(isApprovedDestination(valid, US_BID_SMARTER_CAMPAIGN)).toBe(true);
    expect(isApprovedDestination("https://evil.example/collect", US_BID_SMARTER_CAMPAIGN)).toBe(false);
    expect(isApprovedDestination("https://www.veltexai.com/tools/cleaning-bid-calculator?redirect=https://evil.example", US_BID_SMARTER_CAMPAIGN)).toBe(false);
  });

  it("re-audits on approval and invalidates approval after edits", () => {
    let draft = bank().placements[0];
    draft = transitionDraft(draft, "needs_review", US_BID_SMARTER_CAMPAIGN, "author");
    draft = transitionDraft(draft, "approved", US_BID_SMARTER_CAMPAIGN, "reviewer", "Verified");
    expect(draft.compliance?.contentHash).toBe(contentHash(draft));
    expect(() => assertApprovalIsCurrent({ ...draft, body: `${draft.body} changed` })).toThrow(/changed/);
    expect(() => transitionDraft({ ...draft, state: "needs_review", body: "Guaranteed contracts" }, "approved", US_BID_SMARTER_CAMPAIGN, "reviewer")).toThrow(/risk flags/);
  });
});

describe("100S measurement and operations", () => {
  const metric: PlacementMetricDaily = { placementId: "p1", provider: "instagram", metricDate: "2026-09-10", reach: 2000, impressions: 2200, threeSecondViews: 800, videoViews: 900, watchSeconds: 13500, videoLengthSeconds: 30, completions: 400, saves: 12, shares: 10, comments: 5, follows: 8, profileVisits: 60, linkTaps: 5 };
  it("uses retention and distribution signals for creative decisions", () => { expect(evaluateCreative(metric).recommendation).toBe("scale"); expect(evaluateCreative({ ...metric, reach: 500 }).recommendation).toBe("insufficient_data"); });
  it("keeps cohort conversion decisions separate", () => { const result = evaluateFunnel({ campaignId: "c", seriesId: "s", cohortMonth: "2026-09", sessions: 100, calculatorUses: 50, demos: 10, signups: 4, activatedUsers: 2, trials: 4, subscribers: 1, revenueCents: 3999 }); expect(result.calculatorEngagementRate).toBe(0.5); expect(result.readyForTrialDecision).toBe(false); });
  it("checks global cadence, not just the current batch", () => { const drafts = bank().placements.filter((item) => item.platform === "facebook").slice(0, 4); const scheduled = scheduleWeek(drafts, new Date("2026-09-07T00:00:00Z")); expect(scheduled.every((draft) => draft.scheduledFor)).toBe(true); expect(() => scheduleWeek(drafts.slice(0, 2), new Date("2026-09-07T00:00:00Z"), scheduled)).toThrow(/cadence exceeded/); });
  it("never generates AI replies for complaints or legal risk", () => { expect(classifyEngagement("I was charged and want a refund").allowAiDraft).toBe(false); expect(classifyEngagement("Is this legal under wage law?").allowAiDraft).toBe(false); expect(classifyEngagement("Can I see a demo?").requiresHumanApproval).toBe(true); });
});
