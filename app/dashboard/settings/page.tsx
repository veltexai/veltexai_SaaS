import { redirect } from 'next/navigation';
import { getUser } from '@/queries/user';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { CompanyProfileSettings } from '@/components/settings/company-profile-settings';
import { SubscriptionBilling } from '@/components/settings/subscription-billing';
import { SecuritySettings } from '@/components/settings/security-settings';
import { NotificationsSettings } from '@/components/settings/notifications-settings';
import { type User as UserType, type Profile } from '@/types/database';

export default async function SettingsPage() {
  const { user, profile } = await getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfileSettings
            user={user as UserType}
            profile={profile as Profile}
          />
          <SubscriptionBilling userId={user.id} />
        </div>

        {/* <CompanyProfileSettings /> */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SecuritySettings />
          {/* <NotificationsSettings /> */}
        </div>
      </div>
    </div>
  );
}
