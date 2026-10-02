import { redirect } from 'next/navigation';
import { getUser } from '@/features/auth/services/get-user';
import { CrmBoard } from '@/features/crm/components/crm-board';

export default async function CrmPage() {
  const { user } = await getUser();
  if (!user) redirect('/auth/login');
  return <CrmBoard />;
}
