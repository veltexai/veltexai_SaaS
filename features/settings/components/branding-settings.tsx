'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { Palette, Eye, Save, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useUserBranding } from '@/hooks/use-user-branding';
import {
  type BrandingSettings,
  COLOR_PRESETS,
  DEFAULT_BRANDING,
} from '@/types/branding';

export default function BrandingSettings() {
  const {
    settings,
    isLoading,
    isSaving,
    saveSettings,
    resetToDefaults,
    applyTheme,
    uploadLogo,
  } = useUserBranding();

  const [localSettings, setLocalSettings] =
    useState<BrandingSettings>(settings);
  const [previewMode, setPreviewMode] = useState(false);

  // Update local settings when settings change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

  // Update local settings and apply theme if in preview mode
  const updateLocalSettings = (newSettings: BrandingSettings) => {
    setLocalSettings(newSettings);
    if (previewMode) {
      applyTheme({
        primary: newSettings.primary_color,
        secondary: newSettings.secondary_color,
        accent: newSettings.accent_color,
      });
    }
  };

  const updateLocalSetting = <K extends keyof BrandingSettings>(
    key: K,
    value: BrandingSettings[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value };
    updateLocalSettings(newSettings);
  };

  const applyColorPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    const newSettings = {
      ...localSettings,
      primary_color: preset.colors.primary,
      secondary_color: preset.colors.secondary,
      accent_color: preset.colors.accent,
    };
    updateLocalSettings(newSettings);
    toast.success(`Applied ${preset.name} color preset`);
  };

  const handleSave = async () => {
    const success = await saveSettings(localSettings);
    if (success) {
      setPreviewMode(false);
    }
  };

  const handleReset = async () => {
    await resetToDefaults();
    setLocalSettings(DEFAULT_BRANDING);
    setPreviewMode(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">
              Loading branding settings...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Customize your company brand colors and theme
            </p>
          </div>
          {/* <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className={
                previewMode ? 'bg-primary text-primary-foreground' : ''
              }
            >
              <Eye className="h-4 w-4" />
              {previewMode ? 'Exit Preview' : 'Live Preview'}
            </Button>
          </div> */}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {previewMode && (
          <div className="rounded-lg border border-primary bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">
                Live Preview Mode - Changes are applied to the interface in
                real-time
              </span>
            </div>
          </div>
        )}

        {/* Color Presets */}
        <div className="space-y-3">
          <div>
            <Label>Quick Color Presets</Label>
          </div>
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
        <div className="space-y-4">
          <div>
            <Label>Custom Colors</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={localSettings.primary_color}
                  onChange={(e) =>
                    updateLocalSetting('primary_color', e.target.value)
                  }
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={localSettings.primary_color}
                  onChange={(e) =>
                    updateLocalSetting('primary_color', e.target.value)
                  }
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
                  value={localSettings.secondary_color}
                  onChange={(e) =>
                    updateLocalSetting('secondary_color', e.target.value)
                  }
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={localSettings.secondary_color}
                  onChange={(e) =>
                    updateLocalSetting('secondary_color', e.target.value)
                  }
                  placeholder="#1e40af"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Supporting color for secondary elements
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent_color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent_color"
                  type="color"
                  value={localSettings.accent_color}
                  onChange={(e) =>
                    updateLocalSetting('accent_color', e.target.value)
                  }
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={localSettings.accent_color}
                  onChange={(e) =>
                    updateLocalSetting('accent_color', e.target.value)
                  }
                  placeholder="#f59e0b"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Accent color for notifications and special elements
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Theme Application Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <Label>Theme Application</Label>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="theme_applied_to_pdfs">Apply Theme to PDFs</Label>
              <p className="text-sm text-muted-foreground">
                Apply your custom colors and branding to generated PDF proposals
              </p>
            </div>
            <Switch
              id="theme_applied_to_pdfs"
              checked={localSettings.theme_applied_to_pdfs}
              onCheckedChange={(checked) =>
                updateLocalSetting('theme_applied_to_pdfs', checked)
              }
            />
          </div>
        </div>

        <Separator />

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
                  This will reset all branding settings to their default values.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>
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
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="min-w-[120px]"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
