import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BrandingSettings, DEFAULT_BRANDING } from '@/types/branding';
import { applyTheme, resetTheme } from '@/lib/theme';
import { toast } from 'sonner';

export function useBranding() {
  const [settings, setSettings] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const supabase = createClient();

  // Load branding settings from database
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const brandingSettings: BrandingSettings = {
          company_name: data.company_name || DEFAULT_BRANDING.company_name,
          company_logo_url: data.company_logo_url || DEFAULT_BRANDING.company_logo_url,
          company_tagline: data.company_tagline || DEFAULT_BRANDING.company_tagline,
          primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
          secondary_color: data.secondary_color || DEFAULT_BRANDING.secondary_color,
          accent_color: data.accent_color || DEFAULT_BRANDING.accent_color,
          theme_applied_to_pdfs: data.theme_applied_to_pdfs ?? DEFAULT_BRANDING.theme_applied_to_pdfs,
          ai_attribution_enabled: data.ai_attribution_enabled ?? DEFAULT_BRANDING.ai_attribution_enabled,
          proposal_tracking_enabled: data.proposal_tracking_enabled ?? DEFAULT_BRANDING.proposal_tracking_enabled,
        };
        
        setSettings(brandingSettings);
        applyTheme(brandingSettings);
      } else {
        // No settings found, use defaults
        setSettings(DEFAULT_BRANDING);
        applyTheme(DEFAULT_BRANDING);
      }
    } catch (error) {
      console.error('Error loading branding settings:', error);
      toast.error('Failed to load branding settings');
      setSettings(DEFAULT_BRANDING);
      applyTheme(DEFAULT_BRANDING);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Save branding settings to database
  const saveSettings = useCallback(async (newSettings: BrandingSettings) => {
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          company_name: newSettings.company_name,
          company_logo_url: newSettings.company_logo_url,
          company_tagline: newSettings.company_tagline,
          primary_color: newSettings.primary_color,
          secondary_color: newSettings.secondary_color,
          accent_color: newSettings.accent_color,
          theme_applied_to_pdfs: newSettings.theme_applied_to_pdfs,
          ai_attribution_enabled: newSettings.ai_attribution_enabled,
          proposal_tracking_enabled: newSettings.proposal_tracking_enabled,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSettings(newSettings);
      applyTheme(newSettings);
      setHasChanges(false);
      
      toast.success('Branding settings saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast.error('Failed to save branding settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [supabase]);

  // Update settings locally (for preview)
  const updateSettings = useCallback((newSettings: BrandingSettings) => {
    setSettings(newSettings);
    applyTheme(newSettings);
    setHasChanges(true);
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      setIsSaving(true);
      
      const success = await saveSettings(DEFAULT_BRANDING);
      if (success) {
        setSettings(DEFAULT_BRANDING);
        applyTheme(DEFAULT_BRANDING);
        setHasChanges(false);
        toast.success('Branding settings reset to defaults');
      }
    } catch (error) {
      console.error('Error resetting branding settings:', error);
      toast.error('Failed to reset branding settings');
    } finally {
      setIsSaving(false);
    }
  }, [saveSettings]);

  // Upload logo
  const uploadLogo = useCallback(async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
      return null;
    }
  }, [supabase]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Cleanup theme on unmount
  useEffect(() => {
    return () => {
      resetTheme();
    };
  }, []);

  return {
    settings,
    isLoading,
    isSaving,
    hasChanges,
    updateSettings,
    saveSettings,
    resetToDefaults,
    uploadLogo,
    reloadSettings: loadSettings,
  };
}

export default useBranding;