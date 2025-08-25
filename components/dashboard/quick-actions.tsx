import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  TrendingUp,
  Plus,
} from 'lucide-react';

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create New Proposal</CardTitle>
          <CardDescription>
            Use AI to generate a professional proposal in minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/proposals/new">
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Get Started
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">View All Proposals</CardTitle>
          <CardDescription>
            Manage and track all your proposals in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/proposals">
            <Button variant="outline" className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              View Proposals
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Settings</CardTitle>
          <CardDescription>
            Update your profile and subscription settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/settings">
            <Button variant="outline" className="w-full">
              <TrendingUp className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}