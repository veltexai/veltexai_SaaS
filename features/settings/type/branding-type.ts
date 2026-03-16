export interface BrandingSettingsInterface {
  company_name: string;
  company_logo_url?: string | null;
  company_tagline?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  theme_applied_to_pdfs: boolean;
  ai_attribution_enabled: boolean;
  proposal_tracking_enabled: boolean;
}

export interface ColorPalette {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface FullColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface BrandingPreview {
  colors: ColorPalette;
  company_name: string;
  company_logo_url?: string | null;
  company_tagline?: string | null;
}

export interface ThemeVariables {
  "--color-primary": string;
  "--color-secondary": string;
  "--color-accent": string;
  "--color-primary-rgb": string;
  "--color-secondary-rgb": string;
  "--color-accent-rgb": string;
}

export interface BrandingFormData {
  company_name: string;
  company_tagline: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_file?: File | null;
  theme_applied_to_pdfs: boolean;
  ai_attribution_enabled: boolean;
  proposal_tracking_enabled: boolean;
}

export interface LogoUploadResult {
  url: string;
  success: boolean;
  error?: string;
}

// Utility functions for color manipulation
export interface ColorUtils {
  hexToRgb: (hex: string) => { r: number; g: number; b: number } | null;
  rgbToHex: (r: number, g: number, b: number) => string;
  isValidHex: (hex: string) => boolean;
  generateColorVariations: (baseColor: string) => {
    light: string;
    dark: string;
    contrast: string;
  };
}
