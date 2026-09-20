import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export async function canUsePaidProposalActions(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('get_user_usage_info', { user_uuid: userId })
    .single();
  if (error || !data) {
    console.error('Unable to verify paid proposal entitlement', error?.message);
    return false;
  }
  return (data as { subscription_status?: string | null }).subscription_status === 'active';
}
