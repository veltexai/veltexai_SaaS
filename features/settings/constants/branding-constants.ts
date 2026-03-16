import type {
  BrandingSettingsInterface,
  ColorPalette,
} from "@/features/settings/type/branding-type";

// Default branding settings
export const DEFAULT_BRANDING: BrandingSettingsInterface = {
  company_name: "Veltex Services",
  company_logo_url: null,
  company_tagline: "Professional Cleaning Solutions",
  primary_color: "#3B82F6",
  secondary_color: "#1E40AF",
  accent_color: "#F59E0B",
  theme_applied_to_pdfs: true,
  ai_attribution_enabled: true,
  proposal_tracking_enabled: true,
};

// Color presets for quick selection
export const COLOR_PRESETS: Array<ColorPalette> = [
  {
    name: "Professional Blue",
    colors: {
      primary: "#3B82F6",
      secondary: "#1E40AF",
      accent: "#F59E0B",
    },
  },
  {
    name: "Corporate Green",
    colors: {
      primary: "#10B981",
      secondary: "#047857",
      accent: "#F59E0B",
    },
  },
  {
    name: "Modern Purple",
    colors: {
      primary: "#8B5CF6",
      secondary: "#7C3AED",
      accent: "#F59E0B",
    },
  },
  {
    name: "Classic Navy",
    colors: {
      primary: "#1E3A8A",
      secondary: "#1E40AF",
      accent: "#EF4444",
    },
  },
  {
    name: "Fresh Teal",
    colors: {
      primary: "#0D9488",
      secondary: "#0F766E",
      accent: "#F59E0B",
    },
  },
];
