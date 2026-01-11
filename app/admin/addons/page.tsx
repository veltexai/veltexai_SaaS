import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AddonList } from '@/features/admin/addons';

/**
 * Admin Add-Ons Management Page
 * Manage additional service catalog
 */

async function checkAdminAccess() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return user;
}

export default async function AddonsPage() {
  await checkAdminAccess();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add-On Services</h1>
        <p className="text-muted-foreground mt-2">
          Manage additional services that can be included in proposals
        </p>
      </div>

      <AddonList />
    </div>
  );
}











