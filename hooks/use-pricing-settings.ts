'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type Database } from '@/types/database';
import { toast } from 'sonner';

type PricingSettings = Database['public']['Tables']['pricing_settings']['Row'];
type PricingSettingsInsert =
  Database['public']['Tables']['pricing_settings']['Insert'];
type PricingSettingsUpdate =
  Database['public']['Tables']['pricing_settings']['Update'];

export function usePricingSettings() {
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch pricing settings for the current user
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('pricing_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // No settings found, create default settings
        await createDefaultSettings(user.id);
      }
    } catch (err) {
      console.error('Error fetching pricing settings:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch pricing settings'
      );
    } finally {
      setLoading(false);
    }
  };

  // Create default pricing settings for a user
  const createDefaultSettings = async (userId: string) => {
    try {
      const defaultSettings: PricingSettingsInsert = {
        user_id: userId,
        labor_rate: 35.0,
        overhead_percentage: 15.0,
        margin_percentage: 25.0,
        service_type_rates: {
          residential: 0.15,
          commercial: 0.12,
          carpet: 0.25,
          window: 8.0,
          floor: 0.2,
        },
        frequency_multipliers: {
          one_time: 1.0,
          weekly: 0.9,
          bi_weekly: 0.95,
          monthly: 1.0,
          quarterly: 1.1,
        },
        production_rates: {
          standard: 1.0,
          rush: 1.5,
          express: 2.0,
        },
      };

      const { data, error } = await supabase
        .from('pricing_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast.success('Default pricing settings created');
    } catch (err) {
      console.error('Error creating default settings:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create default settings'
      );
    }
  };

  // Update pricing settings
  const updateSettings = async (updates: PricingSettingsUpdate) => {
    try {
      if (!settings) {
        throw new Error('No settings to update');
      }

      const { data, error } = await supabase
        .from('pricing_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast.success('Pricing settings updated successfully');
      return data;
    } catch (err) {
      console.error('Error updating pricing settings:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to update pricing settings';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Update service type rates
  const updateServiceTypeRates = async (
    serviceTypeRates: Record<string, number>
  ) => {
    if (!settings) return;

    const currentRates =
      (settings.service_type_rates as Record<string, number>) || {};
    return updateSettings({
      service_type_rates: {
        ...currentRates,
        ...serviceTypeRates,
      },
    });
  };

  // Update frequency multipliers
  const updateFrequencyMultipliers = async (
    multipliers: Record<string, number>
  ) => {
    if (!settings) return;

    const currentMultipliers =
      (settings.frequency_multipliers as Record<string, number>) || {};
    return updateSettings({
      frequency_multipliers: {
        ...currentMultipliers,
        ...multipliers,
      },
    });
  };

  // Update production rates
  const updateProductionRates = async (
    productionRates: Record<string, number>
  ) => {
    if (!settings) return;

    const currentRates =
      (settings.production_rates as Record<string, number>) || {};
    return updateSettings({
      production_rates: {
        ...currentRates,
        ...productionRates,
      },
    });
  };

  // Update labor and overhead settings
  const updateLaborSettings = async (
    laborRate: number,
    overheadPercentage: number,
    marginPercentage: number
  ) => {
    return updateSettings({
      labor_rate: laborRate,
      overhead_percentage: overheadPercentage,
      margin_percentage: marginPercentage,
    });
  };

  // Reset to default settings
  const resetToDefaults = async () => {
    const defaultSettings = {
      labor_rate: 25,
      overhead_percentage: 20,
      margin_percentage: 15,
      service_type_rates: {
        residential: 0.15,
        commercial: 0.2,
        carpet: 0.12,
        window: 0.08,
        floor: 0.18,
      },
      frequency_multipliers: {
        'one-time': 1.0,
        weekly: 0.9,
        biweekly: 0.95,
        monthly: 0.85,
      },
      production_rates: {
        standard: 1.0,
        rush: 1.5,
        express: 2.0,
      },
    };

    return updateSettings(defaultSettings);
  };

  // Get settings for a specific service type
  const getServiceSettings = (serviceType: string) => {
    if (!settings) return null;

    const serviceTypeRates =
      (settings.service_type_rates as Record<string, number>) || {};
    const frequencyMultipliers =
      (settings.frequency_multipliers as Record<string, number>) || {};

    return {
      baseRate: serviceTypeRates[serviceType] || 0,
      laborRate: settings.labor_rate,
      overheadPercentage: settings.overhead_percentage,
      marginPercentage: settings.margin_percentage,
      frequencyMultipliers: frequencyMultipliers,
    };
  };

  // Calculate quick estimate
  const calculateQuickEstimate = (
    serviceType: string,
    facilitySize: number,
    frequency: string = 'one-time'
  ) => {
    if (!settings) return 0;

    const serviceTypeRates =
      (settings.service_type_rates as Record<string, number>) || {};
    const frequencyMultipliers =
      (settings.frequency_multipliers as Record<string, number>) || {};

    const baseRate = serviceTypeRates[serviceType] || 0.15;
    const frequencyMultiplier = frequencyMultipliers[frequency] || 1.0;
    const basePrice = facilitySize * baseRate * frequencyMultiplier;
    const overhead = basePrice * (settings.overhead_percentage / 100);
    const margin = basePrice * (settings.margin_percentage / 100);

    return Math.round((basePrice + overhead + margin) * 100) / 100;
  };

  // Initialize settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
    updateBaseRates: updateServiceTypeRates,
    updateServiceTypeRates,
    updateFrequencyMultipliers,
    updateServiceAdjustments: updateServiceTypeRates,
    updateProductionRates,
    updateLaborSettings,
    resetToDefaults,
    getServiceSettings,
    calculateQuickEstimate,
  };
}

// Hook for read-only pricing settings (useful for pricing calculations)
export function usePricingSettingsReadOnly() {
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('pricing_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setSettings(data);
        }
      } catch (err) {
        console.error('Error fetching pricing settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}
