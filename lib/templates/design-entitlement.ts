// Server-side enforcement of proposal DESIGN entitlement.
//
// The client pickers lock designs a plan does not include, but that is
// presentation only — `template_id` arrives in the request body and was
// previously written straight through by /api/proposals/generate,
// /api/proposals and /api/proposals/[id]. This module is the authoritative
// check those routes call.
//
// Not marked "use server": it is a plain server-only helper, so route handlers
// can import it directly without every export becoming a server action.

import { createClient } from "@/lib/supabase/server";
import {
  canAccessTemplate,
  resolveDesignTier,
} from "@/features/proposals/utils/can-access-template";
import type { SubscriptionTier } from "@/types/subscription";

/** Message returned to the client on a 403. Deliberately non-specific. */
export const DESIGN_NOT_ENTITLED_MESSAGE =
  "Your plan does not include this proposal design.";

/**
 * Whether `userId` may use design `templateId`.
 *
 * Fails closed: a missing profile, an inactive or unknown template, a template
 * with no tier rows, or any query error all deny.
 */
export async function userCanAccessTemplate(
  userId: string,
  templateId: string,
): Promise<boolean> {
  if (!templateId) return false;

  try {
    const supabase = await createClient();

    // A trial user has no `subscriptions` row and their `subscription_plan`
    // reads 'starter', so the status column is what identifies them.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_plan, subscription_status")
      .eq("id", userId)
      .single();

    if (profileError || !profile) return false;

    const { data: template, error: templateError } = await supabase
      .from("proposal_templates")
      .select("id, template_tier_access ( subscription_tier )")
      .eq("id", templateId)
      .eq("is_active", true)
      .single();

    if (templateError || !template) return false;

    const tiers = (
      (template.template_tier_access ?? []) as Array<{
        subscription_tier: SubscriptionTier;
      }>
    ).map((access) => access.subscription_tier);

    return canAccessTemplate(
      tiers,
      resolveDesignTier(profile.subscription_plan, profile.subscription_status),
    );
  } catch (error) {
    console.error("Error checking design entitlement:", error);
    return false;
  }
}
