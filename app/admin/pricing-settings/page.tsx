import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import PricingSettingsForm from '@/components/admin/pricing-settings-form';
import PricingCalculator from '@/components/admin/pricing-calculator';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PricingSettings {
  id: string;
  user_id: string;
  labor_rate: number;
  production_rates: {
    [key: string]: number;
  };
  created_at: string;
  updated_at: string;
}

const defaultProductionRates = {
  business_cards: 0.15,
  flyers: 0.25,
  brochures: 0.45,
  banners: 2.5,
  posters: 1.25,
  stickers: 0.08,
  postcards: 0.2,
  booklets: 0.75,
  catalogs: 1.5,
  magazines: 2.0,
};

async function checkAdminAccess() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
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

async function fetchPricingSettings(): Promise<PricingSettings | null> {
  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase
      .from('pricing_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching pricing settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    return null;
  }
}

export default async function PricingSettingsPage() {
  const currentUser = await checkAdminAccess();
  const settings = await fetchPricingSettings();

  const initialSettings = settings || {
    id: '',
    user_id: currentUser.id,
    labor_rate: 75,
    production_rates: defaultProductionRates,
    created_at: '',
    updated_at: '',
  };

  return (
    <div className="container mx-auto py-6 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing Settings</h1>
          <p className="text-muted-foreground">
            Configure global pricing rates and preview calculations
          </p>
        </div>
      </div>

      <PricingSettingsForm
        initialSettings={initialSettings}
        currentUserId={currentUser.id}
        defaultProductionRates={defaultProductionRates}
      />

      <PricingCalculator
        productionRates={initialSettings.production_rates}
        laborRate={initialSettings.labor_rate}
      />
    </div>
  );
}
