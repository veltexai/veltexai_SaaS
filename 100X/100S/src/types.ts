export const WORKFLOW_ID = "100S" as const;
export const RULES_VERSION = "100s-compliance-v2" as const;
export type Platform = "facebook" | "instagram" | "linkedin" | "youtube";
export type Format = "reel" | "short" | "native_video" | "carousel" | "document" | "story" | "link";
export type FunnelStage = "awareness" | "consideration" | "conversion";
export type DraftState = "draft" | "needs_review" | "approved" | "scheduled" | "published" | "rejected";
export type ContentPillar = "education" | "product_demo" | "pain_point" | "founder_authority" | "proof" | "promotion";
export type ClaimType = "statistic" | "definition" | "product_capability" | "opinion";
export interface CampaignBrief { id: string; name: string; market: "US"; trafficMedium: "organic_social" | "paid_social"; audience: string; objective: string; offer: "resource_center" | "bid_calculator" | "demo_proposal" | "free_trial"; destinationUrl: string; approvedDestinationPaths?: string[]; approvedClaimIds?: string[]; approvedClaims: string[]; prohibitedClaims: string[] }
export interface ResearchSource { id: string; url: string; publisher: string; retrievedAt: string; snapshotHash: string | null }
export interface ResearchClaim { id: string; sourceId: string; assertion: string; type: ClaimType; substantiation: string; verifiedBy: string; verifiedAt: string; expiresAt: string | null }
export interface ResearchInsight { id: string; sourceUrl: string; title: string; summary: string; audienceProblem: string; collectedAt: string; verified: boolean; claimIds?: string[] }
export interface ReelScript { hook: string; scenes: Array<{ seconds: string; visual: string; voiceover: string; onScreenText: string }>; caption: string; callToAction: string; targetSeconds: number; shotNotes: string[]; thumbnailText: string }
export interface CreativeUnit { id: string; campaignId: string; seriesId: string; sourceInsightIds: string[]; claimIds: string[]; pillar: ContentPillar; funnelStage: FunnelStage; workingTitle: string; hookVariantId: string; lengthBucket: "15-22" | "20-30" | "30-45" | "40-60"; script: ReelScript; bRollManifest: string[]; productScreens: string[] }
export interface PlatformAccount { id: string; platform: Platform; label: string; handle: string | null; providerAccountId: string | null; owner: string; approver: string; active: boolean }
export interface ComplianceVerdict { rulesVersion: typeof RULES_VERSION; contentHash: string; approved: boolean; flags: string[]; evaluatedAt: string }
export interface ContentDraft { id: string; idempotencyKey: string; campaignId: string; creativeUnitId: string; sourceInsightIds: string[]; claimIds: string[]; platform: Platform; accountId: string | null; format: Format; pillar: ContentPillar; funnelStage: FunnelStage; title: string; body: string; callToAction: string; firstComment: string; thumbnailText: string; hashtags: string[]; destinationUrl: string; scheduledFor: string | null; state: DraftState; compliance: ComplianceVerdict | null; reel: ReelScript | null; createdBy: string; approvedBy: string | null; approvedAt: string | null; reviewerNotes: string | null; createdAt: string }
export interface PlacementMetricDaily { placementId: string; provider: Platform; metricDate: string; reach: number; impressions: number; threeSecondViews: number; videoViews: number; watchSeconds: number; videoLengthSeconds: number; completions: number; saves: number; shares: number; comments: number; follows: number; profileVisits: number; linkTaps: number }
export interface FunnelCohortMetric { campaignId: string; seriesId: string; cohortMonth: string; sessions: number; calculatorUses: number; demos: number; signups: number; activatedUsers: number; trials: number; subscribers: number; revenueCents: number }
export interface CreativeLearning { placementId: string; hookRate: number; averageViewPercent: number; distributionPerThousand: number; profileVisitRate: number; followsPerThousand: number; recommendation: "scale" | "iterate" | "retire" | "insufficient_data"; reasons: string[] }
export type EngagementClass = "question" | "objection" | "complaint" | "spam" | "lead" | "legal_risk";
export interface EngagementDecision { classification: EngagementClass; allowAiDraft: boolean; requiresHumanApproval: true; priority: "normal" | "high" | "urgent"; reason: string }
