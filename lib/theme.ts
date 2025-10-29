import { BrandingSettings, FullColorPalette } from '@/types/branding';

/**
 * Apply theme colors to CSS custom properties
 */
export function applyTheme(settings: BrandingSettings): void {
  const root = document.documentElement;
  
  // Apply color variables
  root.style.setProperty('--color-primary', settings.primary_color);
  root.style.setProperty('--color-secondary', settings.secondary_color);
  root.style.setProperty('--color-accent', settings.accent_color);
  
  // Generate color variations for better UI integration
  const primaryRgb = hexToRgb(settings.primary_color);
  const secondaryRgb = hexToRgb(settings.secondary_color);
  const accentRgb = hexToRgb(settings.accent_color);
  
  if (primaryRgb) {
    root.style.setProperty('--color-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
    root.style.setProperty('--color-primary-50', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.05)`);
    root.style.setProperty('--color-primary-100', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`);
    root.style.setProperty('--color-primary-200', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`);
    root.style.setProperty('--color-primary-500', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.5)`);
    root.style.setProperty('--color-primary-900', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.9)`);
  }
  
  if (secondaryRgb) {
    root.style.setProperty('--color-secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
    root.style.setProperty('--color-secondary-50', `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.05)`);
    root.style.setProperty('--color-secondary-100', `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.1)`);
  }
  
  if (accentRgb) {
    root.style.setProperty('--color-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    root.style.setProperty('--color-accent-50', `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.05)`);
    root.style.setProperty('--color-accent-100', `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.1)`);
  }
}

/**
 * Apply theme variables from colors object
 */
export function applyThemeVariables(colors: { primary: string; secondary: string; accent: string }): void {
  const root = document.documentElement;
  
  // Apply color variables
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-secondary', colors.secondary);
  root.style.setProperty('--color-accent', colors.accent);
  
  // Convert hex to RGB for CSS variables that need RGB values
  const primaryRgb = hexToRgb(colors.primary);
  const secondaryRgb = hexToRgb(colors.secondary);
  const accentRgb = hexToRgb(colors.accent);
  
  if (primaryRgb) {
    root.style.setProperty('--color-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
  }
  if (secondaryRgb) {
    root.style.setProperty('--color-secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
  }
  if (accentRgb) {
    root.style.setProperty('--color-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
  }
}

/**
 * Reset theme to default values
 */
export function resetTheme(): void {
  const root = document.documentElement;
  
  // Remove custom properties
  root.style.removeProperty('--color-primary');
  root.style.removeProperty('--color-secondary');
  root.style.removeProperty('--color-accent');
  root.style.removeProperty('--color-primary-rgb');
  root.style.removeProperty('--color-primary-50');
  root.style.removeProperty('--color-primary-100');
  root.style.removeProperty('--color-primary-200');
  root.style.removeProperty('--color-primary-500');
  root.style.removeProperty('--color-primary-900');
  root.style.removeProperty('--color-secondary-rgb');
  root.style.removeProperty('--color-secondary-50');
  root.style.removeProperty('--color-secondary-100');
  root.style.removeProperty('--color-accent-rgb');
  root.style.removeProperty('--color-accent-50');
  root.style.removeProperty('--color-accent-100');
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Calculate luminance of a color
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if a color is light or dark
 */
export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.5;
}

/**
 * Generate a complementary color
 */
export function getComplementaryColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const { r, g, b } = rgb;
  return rgbToHex(255 - r, 255 - g, 255 - b);
}

/**
 * Lighten or darken a color by a percentage
 */
export function adjustColorBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const { r, g, b } = rgb;
  const factor = percent / 100;
  
  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);
  
  return rgbToHex(
    Math.max(0, Math.min(255, newR)),
    Math.max(0, Math.min(255, newG)),
    Math.max(0, Math.min(255, newB))
  );
}

/**
 * Generate color palette from a base color
 */
export function generateColorPalette(baseColor: string): FullColorPalette {
  return {
    50: adjustColorBrightness(baseColor, 95),
    100: adjustColorBrightness(baseColor, 90),
    200: adjustColorBrightness(baseColor, 75),
    300: adjustColorBrightness(baseColor, 60),
    400: adjustColorBrightness(baseColor, 30),
    500: baseColor,
    600: adjustColorBrightness(baseColor, -20),
    700: adjustColorBrightness(baseColor, -40),
    800: adjustColorBrightness(baseColor, -60),
    900: adjustColorBrightness(baseColor, -80),
  };
}

/**
 * Validate color accessibility
 */
export function validateColorAccessibility(foreground: string, background: string): {
  isValid: boolean;
  ratio: number;
  level: 'AA' | 'AAA' | 'fail';
} {
  const ratio = getContrastRatio(foreground, background);
  
  let level: 'AA' | 'AAA' | 'fail' = 'fail';
  if (ratio >= 7) level = 'AAA';
  else if (ratio >= 4.5) level = 'AA';
  
  return {
    isValid: ratio >= 4.5,
    ratio,
    level
  };
}

/**
 * Get theme CSS for PDF generation
 */
export function getThemeCSS(settings: BrandingSettings): string {
  return `
    :root {
      --color-primary: ${settings.primary_color};
      --color-secondary: ${settings.secondary_color};
      --color-accent: ${settings.accent_color};
    }
    
    .theme-primary {
      color: ${settings.primary_color};
    }
    
    .theme-primary-bg {
      background-color: ${settings.primary_color};
    }
    
    .theme-secondary {
      color: ${settings.secondary_color};
    }
    
    .theme-secondary-bg {
      background-color: ${settings.secondary_color};
    }
    
    .theme-accent {
      color: ${settings.accent_color};
    }
    
    .theme-accent-bg {
      background-color: ${settings.accent_color};
    }
    
    .theme-border-primary {
      border-color: ${settings.primary_color};
    }
    
    .theme-border-secondary {
      border-color: ${settings.secondary_color};
    }
    
    .theme-border-accent {
      border-color: ${settings.accent_color};
    }
  `;
}