"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { type BrandingSettingsInterface } from "@/features/settings/type/branding-type";
import { DEFAULT_BRANDING } from "@/features/settings/constants/branding-constants";
import { applyThemeVariables } from "@/lib/theme";

interface UserBrandingDbPayload {
  user_id: string;
  company_name: string;
  company_logo_url?: string | null;
  company_tagline?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  theme_applied_to_pdfs: boolean;
}

function toDbPayload(
  settings: BrandingSettingsInterface,
  userId: string,
): UserBrandingDbPayload {
  return {
    user_id: userId,
    company_name: settings.company_name,
    company_logo_url: settings.company_logo_url,
    company_tagline: settings.company_tagline,
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    accent_color: settings.accent_color,
    theme_applied_to_pdfs: settings.theme_applied_to_pdfs,
  };
}

export function useUserBrandingMutations() {
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);

  const saveSettings = useCallback(
    async (newSettings: BrandingSettingsInterface): Promise<boolean> => {
      try {
        setIsSaving(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          toast.error("Authentication required");
          return false;
        }

        const payload = toDbPayload(newSettings, user.id);

        const { error } = await supabase
          .from("user_branding_settings")
          .upsert(payload, { onConflict: "user_id" });

        if (error) {
          console.error("Error saving branding settings:", error);
          toast.error("Failed to save branding settings");
          return false;
        }

        applyThemeVariables({
          primary: newSettings.primary_color,
          secondary: newSettings.secondary_color,
          accent: newSettings.accent_color,
        });

        toast.success("Branding settings saved successfully");
        return true;
      } catch (error) {
        console.error("Error saving branding settings:", error);
        toast.error("Failed to save branding settings");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [supabase],
  );

  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    const success = await saveSettings(DEFAULT_BRANDING);
    if (success) {
      toast.success("Branding settings reset to defaults");
    }
    return success;
  }, [saveSettings]);

  const applyTheme = useCallback(
    (colors: { primary: string; secondary: string; accent: string }) => {
      applyThemeVariables(colors);
    },
    [],
  );

  const uploadLogo = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          toast.error("Authentication required");
          return null;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `company-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("company-assets")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Error uploading logo:", uploadError);
          toast.error("Failed to upload logo");
          return null;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("company-assets").getPublicUrl(filePath);

        return publicUrl;
      } catch (error) {
        console.error("Error uploading logo:", error);
        toast.error("Failed to upload logo");
        return null;
      }
    },
    [supabase],
  );

  return {
    isSaving,
    saveSettings,
    resetToDefaults,
    applyTheme,
    uploadLogo,
  };
}
