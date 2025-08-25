import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Welcome back, {profile?.full_name || 'User'}!
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening with your proposals today.
        </p>
      </div>
      <div className="mt-4 flex md:ml-4 md:mt-0">
        <Link href="/dashboard/proposals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Proposal
          </Button>
        </Link>
      </div>
    </div>
  );
}