"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveDesignTier } from "@/features/proposals/utils/can-access-template";
import type { SubscriptionTier as UserTier } from "@/types/subscription";

export interface UseUserTierResult {
  tier: UserTier;
  /** True until the tier is known. Gate design unlocking on this. */
  isLoading: boolean;
}

/**
 * The tier used to evaluate PROPOSAL DESIGN access.
 *
 * Starts at `starter` (the least-privileged tier) rather than `free_trial`, so
 * the first render before the fetch resolves shows designs locked instead of
 * briefly unlocking premium ones. Callers should prefer `isLoading` over
 * reading the tier during that window.
 */
export function useUserTier(userId: string): UseUserTierResult {
  const [tier, setTier] = useState<UserTier>("starter");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setTier("starter");
    setIsLoading(true);

    const fetchUserTier = async (): Promise<void> => {
      try {
        const supabase = createClient();

        // Use the same billing-maintained source as the server entitlement guard.
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("subscription_plan, subscription_status")
          .eq("id", userId)
          .single();

        if (!mounted || error) return;

        setTier(
          resolveDesignTier(
            profile?.subscription_plan,
            profile?.subscription_status,
          ),
        );
      } catch (err) {
        console.error("Error fetching user tier:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchUserTier();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { tier, isLoading };
}
