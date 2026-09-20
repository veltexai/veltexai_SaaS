import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { NavButton } from "@/components/ui/nav-button";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

interface WelcomeSectionProps {
  profile: UserProfile | null;
}

export function WelcomeSection({ profile }: WelcomeSectionProps) {
  return (
    <div className="md:flex md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="break-words pb-1 text-2xl font-bold leading-8 text-gray-900 sm:text-3xl sm:leading-10 sm:tracking-tight">
          Welcome, {profile?.full_name || "User"}!
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Start with a real cleaning job and build a proposal you can review.
        </p>
        <p className="mt-1 text-xs text-gray-400 italic">
          All outputs are constrained by labor, frequency, and margin rules
          based on real janitorial operations.
        </p>
      </div>
      <div className="mt-4 flex md:ml-4 md:mt-0">
        <NavButton
          href="/dashboard/proposals/quick?source=dashboard"
          icon={<Plus className="h-4 w-4" />}
          size="lg"
          variant="default"
        >
          Build a Proposal
        </NavButton>
      </div>
    </div>
  );
}
