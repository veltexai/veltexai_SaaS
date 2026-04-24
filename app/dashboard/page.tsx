import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/queries/user";
import { WelcomeSection } from "@/features/dashboard/components/welcome-section";
import { DashboardStats } from "@/features/dashboard/components/dashboard-stats";
import { RecentProposals } from "@/features/dashboard/components/recent-proposals";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { OnboardingBanner } from "@/features/dashboard/components/onboarding-banner";
import { TrialUpgradeBanner } from "@/features/dashboard/components/trial-upgrade-banner";
import MetaPixelTracker from "@/components/MetaPixelTracker";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DashboardStats {
  totalProposals: number;
  activeProposals: number;
  wonProposals: number;
  totalValue: number;
}

interface RecentProposal {
  id: string;
  title: string;
  client_name: string;
  status: string;
  created_at: string;
  value: number;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

interface UsageInfo {
  current_usage: number;
  proposal_limit: number;
  can_create_proposal: boolean;
  subscription_plan: string;
  subscription_status: string;
  remaining_proposals: number;
  is_trial: boolean;
  trial_end_at: string | null;
}

interface TrialBannerProps {
  trialState: "active" | "ended";
  remainingProposals: number;
  daysRemaining: number;
}

async function getDashboardData(userId: string) {
  const supabase = await createClient();

  // Fetch proposals for stats
  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching proposals:", error);
    return {
      stats: {
        totalProposals: 0,
        activeProposals: 0,
        wonProposals: 0,
        totalValue: 0,
      },
      recentProposals: [],
    };
  }

  // Calculate stats
  const totalProposals = proposals?.length || 0;
  const activeProposals =
    proposals?.filter((p) => p.status === "sent" || p.status === "viewed")
      .length || 0;
  const wonProposals =
    proposals?.filter((p) => p.status === "accepted").length || 0;
  const totalValue =
    proposals?.reduce((sum, p) => {
      // Extract total from pricing_data JSON
      const pricingData = p.pricing_data as any;
      const proposalValue =
        pricingData?.price_range?.high || pricingData?.total || 0;
      return sum + proposalValue;
    }, 0) || 0;

  const stats: DashboardStats = {
    totalProposals,
    activeProposals,
    wonProposals,
    totalValue,
  };

  // Get recent proposals (last 5)
  const recentProposals: RecentProposal[] = proposals?.slice(0, 5) || [];

  return { stats, recentProposals };
}

async function getUserProfile(userId: string) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return profile as UserProfile;
}

async function getUserUsageInfo(userId: string): Promise<UsageInfo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_user_usage_info", { user_uuid: userId })
    .single();

  if (error || !data) {
    console.error("Error fetching usage info:", error);
    return null;
  }

  return data as UsageInfo;
}

/**
 * Derive trial-banner props from usage info.
 * Returns null when the banner should not render (user is not on a free
 * trial, or we couldn't load usage info).
 */
function getTrialBannerProps(usage: UsageInfo | null): TrialBannerProps | null {
  if (!usage) return null;
  if (usage.subscription_status !== "free_trial") return null;

  const trialState: "active" | "ended" = usage.can_create_proposal
    ? "active"
    : "ended";

  const daysRemaining = usage.trial_end_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(usage.trial_end_at).getTime() - Date.now()) / MS_PER_DAY,
        ),
      )
    : 0;

  return {
    trialState,
    remainingProposals: Math.max(0, usage.remaining_proposals ?? 0),
    daysRemaining,
  };
}

export default async function DashboardPage() {
  const { user } = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [{ stats, recentProposals }, profile, usageInfo] = await Promise.all([
    getDashboardData(user.id),
    getUserProfile(user.id),
    getUserUsageInfo(user.id),
  ]);

  const firstName = profile?.full_name?.split(" ")[0]?.trim() || null;

  // Two banners, one slot — mutually exclusive by design:
  //   • 0 proposals            → OnboardingBanner
  //   • ≥ 1 proposal on trial  → TrialUpgradeBanner
  const showOnboarding = stats.totalProposals === 0;
  const trialBannerProps = !showOnboarding
    ? getTrialBannerProps(usageInfo)
    : null;

  return (
    <div className="space-y-6">
      <MetaPixelTracker />
      <WelcomeSection profile={profile} />
      {showOnboarding && (
        <OnboardingBanner
          totalProposals={stats.totalProposals}
          firstName={firstName}
        />
      )}
      {trialBannerProps && <TrialUpgradeBanner {...trialBannerProps} />}
      <DashboardStats stats={stats} />
      <RecentProposals proposals={recentProposals} />
      <QuickActions />
    </div>
  );
}
