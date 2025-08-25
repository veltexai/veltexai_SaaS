import { redirect } from 'next/navigation';
import { getUser } from '@/queries/user';
import { DashboardClientLayout } from '@/components/layout/dashboard-client-layout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <DashboardClientLayout user={user} profile={profile}>
      {children}
    </DashboardClientLayout>
  );
}
