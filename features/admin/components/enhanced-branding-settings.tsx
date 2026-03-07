'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Palette,
  Upload,
  RefreshCw,
  Eye,
  Save,
  RotateCcw,
  FileImage,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { BrandingSettings, COLOR_PRESETS, DEFAULT_BRANDING } from '@/types/branding';
import { SystemSettings } from '@/types/database';

interface EnhancedBrandingSettingsProps {
  initialSettings: Partial<SystemSettings>;
  currentUserId: string;
  onSettingsChange?: (settings: Partial<SystemSettings>) => void;
}

export default function EnhancedBrandingSettings({
  initialSettings,
  currentUserId,
  onSettingsChange,
}: EnhancedBrandingSettingsProps) {
  const [settings, setSettings] = useState<BrandingSettings>({
    company_name: initialSettings.company_name || DEFAULT_BRANDING.company_name,
    company_logo_url: initialSettings.company_logo_url || DEFAULT_BRANDING.company_logo_url,
    company_tagline: initialSettings.company_tagline || DEFAULT_BRANDING.company_tagline,
    primary_color: initialSettings.primary_color || DEFAULT_BRANDING.primary_color,
    secondary_color: initialSettings.secondary_color || DEFAULT_BRANDING.secondary_color,
    accent_color: initialSettings.accent_color || DEFAULT_BRANDING.accent_color,
    theme_applied_to_pdfs: initialSettings.theme_applied_to_pdfs ?? DEFAULT_BRANDING.theme_applied_to_pdfs,
    ai_attribution_enabled: initialSettings.ai_attribution_enabled ?? DEFAULT_BRANDING.ai_attribution_enabled,
    proposal_tracking_enabled: initialSettings.proposal_tracking_enabled ?? DEFAULT_BRANDING.proposal_tracking_enabled,
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Apply theme variables to CSS custom properties for live preview
    if (previewMode) {
      applyThemeVariables();
    } else {
      resetThemeVariables();
    }
  }, [settings, previewMode]);

  const applyThemeVariables = useCallback(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', settings.primary_color);
    root.style.setProperty('--color-secondary', settings.secondary_color);
    root.style.setProperty('--color-accent', settings.accent_color);
    
    // Convert hex to RGB for CSS variables that need RGB values
    const primaryRgb = hexToRgb(settings.primary_color);
    const secondaryRgb = hexToRgb(settings.secondary_color);
    const accentRgb = hexToRgb(settings.accent_color);
    
    if (primaryRgb) {
      root.style.setProperty('--color-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
    }
    if (secondaryRgb) {
      root.style.setProperty('--color-secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
    }
    if (accentRgb) {
      root.style.setProperty('--color-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    }
  }, [settings]);

  const resetThemeVariables = useCallback(() => {
    const root = document.documentElement;
    root.style.removeProperty('--color-primary');
    root.style.removeProperty('--color-secondary');
    root.style.removeProperty('--color-accent');
    root.style.removeProperty('--color-primary-rgb');
    root.style.removeProperty('--color-secondary-rgb');
    root.style.removeProperty('--color-accent-rgb');
  }, []);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const updateSetting = <K extends keyof BrandingSettings>(
    key: K,
    value: BrandingSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    
    // Notify parent component of changes
    if (onSettingsChange) {
      onSettingsChange({ [key]: value });
    }
  };

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setSettings((prev) => ({
      ...prev,
      primary_color: preset.colors.primary,
      secondary_color: preset.colors.secondary,
      accent_color: preset.colors.accent,
    }));
    setHasChanges(true);
    
    if (onSettingsChange) {
      onSettingsChange({
        primary_color: preset.colors.primary,
        secondary_color: preset.colors.secondary,
        accent_color: preset.colors.accent,
      });
    }
    
    toast.success(`Applied ${preset.name} color preset`);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    try {
      setUploading(true);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      updateSetting('company_logo_url', publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          company_name: settings.company_name,
          company_logo_url: settings.company_logo_url,
          company_tagline: settings.company_tagline,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          accent_color: settings.accent_color,
          theme_applied_to_pdfs: settings.theme_applied_to_pdfs,
          ai_attribution_enabled: settings.ai_attribution_enabled,
          proposal_tracking_enabled: settings.proposal_tracking_enabled,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Log admin action
      await supabase.from('audit_logs').insert({
        user_id: currentUserId,
        action: 'update_branding_settings',
        resource_type: 'system_settings',
        details: { 
          updated_fields: Object.keys(settings),
          updated_at: new Date().toISOString() 
        },
      });

      toast.success('Branding settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_BRANDING);
    setHasChanges(true);
    
    if (onSettingsChange) {
      onSettingsChange(DEFAULT_BRANDING);
    }
    
    toast.success('Reset to default branding settings');
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Enhanced Branding Settings</h3>
          <p className="text-sm text-muted-foreground">
            Customize your company branding and theme settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
            className={previewMode ? 'bg-primary text-primary-foreground' : ''}
          >
            <Eye className="h-4 w-4" />
            {previewMode ? 'Exit Preview' : 'Live Preview'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={saveSettings}
            disabled={!hasChanges || saving}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {previewMode && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-primary">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">
                Live Preview Mode - Changes are applied to the interface in real-time
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => updateSetting('company_name', e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_tagline">Company Tagline</Label>
              <Input
                id="company_tagline"
                value={settings.company_tagline || ''}
                onChange={(e) => updateSetting('company_tagline', e.target.value)}
                placeholder="Enter company tagline"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_upload">Company Logo</Label>
            <div className="flex items-center gap-4">
              {settings.company_logo_url && (
                <div className="flex-shrink-0">
                  <img
                    src={settings.company_logo_url}
                    alt="Company Logo"
                    className="h-12 w-12 object-contain rounded border"
                  />
                </div>
              )}
              <div className="flex-1">
                <Input
                  value={settings.company_logo_url || ''}
                  onChange={(e) => updateSetting('company_logo_url', e.target.value)}
                  placeholder="Enter logo URL or upload a file"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  id="logo_upload"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('logo_upload')?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Scheme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Scheme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Presets */}
          <div className="space-y-3">
            <Label>Quick Color Presets</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {COLOR_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => applyColorPreset(preset)}
                  className="h-auto p-3 flex flex-col items-center gap-2"
                >
                  <div className="flex gap-1">
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: preset.colors.primary }}
                    />
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: preset.colors.secondary }}
                    />
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: preset.colors.accent }}
                    />
                  </div>
                  <span className="text-xs">{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom Colors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => updateSetting('primary_color', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => updateSetting('primary_color', e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Main brand color for buttons and highlights
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => updateSetting('secondary_color', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => updateSetting('secondary_color', e.target.value)}
                  placeholder="#1e40af"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Supporting color for backgrounds and borders
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent_color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent_color"
                  type="color"
                  value={settings.accent_color}
                  onChange={(e) => updateSetting('accent_color', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.accent_color}
                  onChange={(e) => updateSetting('accent_color', e.target.value)}
                  placeholder="#f59e0b"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Accent color for notifications and special elements
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Theme Application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="theme_applied_to_pdfs">Apply Theme to PDFs</Label>
              <p className="text-sm text-muted-foreground">
                Apply your custom colors and branding to generated PDF proposals
              </p>
            </div>
            <Switch
              id="theme_applied_to_pdfs"
              checked={settings.theme_applied_to_pdfs}
              onCheckedChange={(checked) => updateSetting('theme_applied_to_pdfs', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="ai_attribution_enabled">AI Attribution</Label>
              <p className="text-sm text-muted-foreground">
                Show "Powered by Veltex AI" attribution in AI-generated content
              </p>
            </div>
            <Switch
              id="ai_attribution_enabled"
              checked={settings.ai_attribution_enabled}
              onCheckedChange={(checked) => updateSetting('ai_attribution_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="proposal_tracking_enabled">Proposal Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Enable tracking of proposal views and engagement metrics
              </p>
            </div>
            <Switch
              id="proposal_tracking_enabled"
              checked={settings.proposal_tracking_enabled}
              onCheckedChange={(checked) => updateSetting('proposal_tracking_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Branding Settings</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all branding settings to their default values. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetToDefaults}>
                Reset to Defaults
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-muted-foreground">
              You have unsaved changes
            </span>
          )}
          <Button
            onClick={saveSettings}
            disabled={!hasChanges || saving}
            className="min-w-[120px]"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}