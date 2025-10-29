import { SystemSettings } from './database';

export interface BrandingSettings {
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
  primary: string;
  secondary: string;
  accent: string;
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
  '--color-primary': string;
  '--color-secondary': string;
  '--color-accent': string;
  '--color-primary-rgb': string;
  '--color-secondary-rgb': string;
  '--color-accent-rgb': string;
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

// Default branding settings
export const DEFAULT_BRANDING: BrandingSettings = {
  company_name: 'Veltex Services',
  company_logo_url: null,
  company_tagline: 'Professional Cleaning Solutions',
  primary_color: '#3B82F6',
  secondary_color: '#1E40AF',
  accent_color: '#F59E0B',
  theme_applied_to_pdfs: true,
  ai_attribution_enabled: true,
  proposal_tracking_enabled: true,
};

// Color presets for quick selection
export const COLOR_PRESETS: Array<{
  name: string;
  colors: ColorPalette;
}> = [
  {
    name: 'Professional Blue',
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#F59E0B',
    },
  },
  {
    name: 'Corporate Green',
    colors: {
      primary: '#10B981',
      secondary: '#047857',
      accent: '#F59E0B',
    },
  },
  {
    name: 'Modern Purple',
    colors: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      accent: '#F59E0B',
    },
  },
  {
    name: 'Classic Navy',
    colors: {
      primary: '#1E3A8A',
      secondary: '#1E40AF',
      accent: '#EF4444',
    },
  },
  {
    name: 'Fresh Teal',
    colors: {
      primary: '#0D9488',
      secondary: '#0F766E',
      accent: '#F59E0B',
    },
  },
];