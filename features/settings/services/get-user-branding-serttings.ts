"use server";

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_BRANDING,
  BrandingSettingsInterface,
} from "@/features/settings";

interface UserBrandingRow {
  id: string;
  user_id: string;
  company_name: string | null;
  company_logo_url: string | null;
  company_tagline: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  theme_applied_to_pdfs: boolean;
  created_at: string;
  updated_at: string;
}

function mapRowToSettings(row: UserBrandingRow): BrandingSettingsInterface {
  return {
    company_name: row.company_name || "",
    company_logo_url: row.company_logo_url,
    company_tagline: row.company_tagline,
    primary_color: row.primary_color,
    secondary_color: row.secondary_color,
    accent_color: row.accent_color,
    theme_applied_to_pdfs: row.theme_applied_to_pdfs,
    ai_attribution_enabled: true,
    proposal_tracking_enabled: true,
  };
}

export async function getUserBrandingSettings(
  userId: string,
): Promise<BrandingSettingsInterface> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_branding_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data && !error) {
    return DEFAULT_BRANDING;
  }

  if (error) {
    console.error("Error fetching branding settings:", error);
    return DEFAULT_BRANDING;
  }

  return mapRowToSettings(data as UserBrandingRow);
}
