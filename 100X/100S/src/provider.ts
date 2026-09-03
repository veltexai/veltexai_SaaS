import type { ContentDraft, Platform } from "./types";
import { assertApprovalIsCurrent } from "./policy";

export interface ProviderPostState { provider: Platform; accountId: string; providerPostId: string; status: "scheduled" | "published" | "missing"; observedAt: string }
export interface SocialProviderAdapter {
  readonly platform: Platform;
  preview(placement: ContentDraft): Promise<{ valid: boolean; warnings: string[] }>;
  reconcile(accountId: string, providerPostId: string): Promise<ProviderPostState>;
  publish?: never; // Deliberately absent until a separately approved write phase.
}
export function assertReadyForProviderPreview(placement: ContentDraft) {
  assertApprovalIsCurrent(placement);
  if (!placement.accountId) throw new Error("Placement has no approved platform account");
  if (placement.state !== "approved" && placement.state !== "scheduled") throw new Error("Placement is not approved for preview");
}
