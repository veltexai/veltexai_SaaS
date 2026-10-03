import { redirect } from 'next/navigation';
import { getUser } from '@/features/auth/services/get-user';
import { CrmBoard } from '@/features/crm/components/crm-board';
import { isCrmWorkspaceEnabled } from '@/features/crm/rollout';

export default async function CrmPage() {
  if (!isCrmWorkspaceEnabled()) redirect('/dashboard');
  const { user } = await getUser();
  if (!user) redirect('/auth/login');
  return <CrmBoard />;
}
