'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { BrandingSettings, DEFAULT_BRANDING } from '@/types/branding';
import { applyThemeVariables } from '@/lib/theme';

interface UserBrandingSettings {
  id?: string;
  user_id: string;
  company_name?: string | null;
  company_logo_url?: string | null;
  company_tagline?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  theme_applied_to_pdfs: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useUserBranding() {
  const [settings, setSettings] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  // Convert database format to BrandingSettings format
  const convertToSettings = (
    dbSettings: UserBrandingSettings
  ): BrandingSettings => ({
    company_name: dbSettings.company_name || '',
    company_logo_url: dbSettings.company_logo_url,
    company_tagline: dbSettings.company_tagline,
    primary_color: dbSettings.primary_color,
    secondary_color: dbSettings.secondary_color,
    accent_color: dbSettings.accent_color,
    theme_applied_to_pdfs: dbSettings.theme_applied_to_pdfs,
    ai_attribution_enabled: true, // Default value
    proposal_tracking_enabled: true, // Default value
  });

  // Convert BrandingSettings format to database format
  const convertToDbFormat = (
    settings: BrandingSettings,
    userId: string
  ): Partial<UserBrandingSettings> => ({
    user_id: userId,
    company_name: settings.company_name,
    company_logo_url: settings.company_logo_url,
    company_tagline: settings.company_tagline,
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    accent_color: settings.accent_color,
    theme_applied_to_pdfs: settings.theme_applied_to_pdfs,
  });

  // Load user branding settings
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        setSettings(DEFAULT_BRANDING);
        return;
      }

      // Fetch user branding settings
      const { data, error } = await supabase
        .from('user_branding_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error loading branding settings:', error);
        toast.error('Failed to load branding settings');
        setSettings(DEFAULT_BRANDING);
        return;
      }

      if (data) {
        const brandingSettings = convertToSettings(data);
        setSettings(brandingSettings);
        applyThemeVariables({
          primary: brandingSettings.primary_color,
          secondary: brandingSettings.secondary_color,
          accent: brandingSettings.accent_color,
        });
      } else {
        // No settings found, use defaults
        setSettings(DEFAULT_BRANDING);
        applyThemeVariables({
          primary: DEFAULT_BRANDING.primary_color,
          secondary: DEFAULT_BRANDING.secondary_color,
          accent: DEFAULT_BRANDING.accent_color,
        });
      }
    } catch (error) {
      console.error('Error loading branding settings:', error);
      toast.error('Failed to load branding settings');
      setSettings(DEFAULT_BRANDING);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Save branding settings
  const saveSettings = useCallback(
    async (newSettings: BrandingSettings) => {
      try {
        setIsSaving(true);

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          toast.error('Authentication required');
          return false;
        }

        const dbData = convertToDbFormat(newSettings, user.id);

        // Upsert the settings
        const { error } = await supabase
          .from('user_branding_settings')
          .upsert(dbData, {
            onConflict: 'user_id',
          });

        if (error) {
          console.error('Error saving branding settings:', error);
          toast.error('Failed to save branding settings');
          return false;
        }

        setSettings(newSettings);
        applyThemeVariables({
          primary: newSettings.primary_color,
          secondary: newSettings.secondary_color,
          accent: newSettings.accent_color,
        });
        toast.success('Branding settings saved successfully');
        return true;
      } catch (error) {
        console.error('Error saving branding settings:', error);
        toast.error('Failed to save branding settings');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [supabase]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    const success = await saveSettings(DEFAULT_BRANDING);
    if (success) {
      toast.success('Branding settings reset to defaults');
    }
    return success;
  }, [saveSettings]);

  // Apply theme without saving
  const applyTheme = useCallback(
    (colors: { primary: string; secondary: string; accent: string }) => {
      applyThemeVariables(colors);
    },
    []
  );

  // Upload logo to Supabase Storage
  const uploadLogo = useCallback(
    async (file: File) => {
      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          toast.error('Authentication required');
          return null;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `company-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company-assets')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading logo:', uploadError);
          toast.error('Failed to upload logo');
          return null;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('company-assets').getPublicUrl(filePath);

        return publicUrl;
      } catch (error) {
        console.error('Error uploading logo:', error);
        toast.error('Failed to upload logo');
        return null;
      }
    },
    [supabase]
  );

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
    resetToDefaults,
    applyTheme,
    uploadLogo,
    refreshSettings: loadSettings,
  };
}
