"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
} from "@/components/ui/alert-dialog";
import { Save, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useUserBrandingMutations } from "@/features/settings/hooks/use-user-branding";
import { type BrandingSettingsInterface } from "@/features/settings/type/branding-type";
import {
  COLOR_PRESETS,
  DEFAULT_BRANDING,
} from "@/features/settings/constants/branding-constants";

interface BrandingSettingsFormProps {
  initialSettings: BrandingSettingsInterface;
}

export function BrandingSettingsForm({
  initialSettings,
}: BrandingSettingsFormProps) {
  const { isSaving, saveSettings, resetToDefaults } =
    useUserBrandingMutations();

  const [localSettings, setLocalSettings] =
    useState<BrandingSettingsInterface>(initialSettings);
  const [savedSettings, setSavedSettings] =
    useState<BrandingSettingsInterface>(initialSettings);

  const hasChanges =
    JSON.stringify(localSettings) !== JSON.stringify(savedSettings);

  const updateLocalSetting = <K extends keyof BrandingSettingsInterface>(
    key: K,
    value: BrandingSettingsInterface[K],
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyColorPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setLocalSettings((prev) => ({
      ...prev,
      primary_color: preset.colors.primary,
      secondary_color: preset.colors.secondary,
      accent_color: preset.colors.accent,
    }));
    toast.success(`Applied ${preset.name} color preset`);
  };

  const handleSave = async () => {
    const success = await saveSettings(localSettings);
    if (success) {
      setSavedSettings(localSettings);
    }
  };

  const handleReset = async () => {
    const success = await resetToDefaults();
    if (success) {
      setLocalSettings(DEFAULT_BRANDING);
      setSavedSettings(DEFAULT_BRANDING);
    }
  };

  return (
    <div className="space-y-6">
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
              onClick={() => handleApplyColorPreset(preset)}
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
          <ColorField
            id="primary_color"
            label="Primary Color"
            description="Main brand color for buttons and highlights"
            placeholder="#3b82f6"
            value={localSettings.primary_color}
            onChange={(value) => updateLocalSetting("primary_color", value)}
          />
          <ColorField
            id="secondary_color"
            label="Secondary Color"
            description="Supporting color for secondary elements"
            placeholder="#1e40af"
            value={localSettings.secondary_color}
            onChange={(value) => updateLocalSetting("secondary_color", value)}
          />
          <ColorField
            id="accent_color"
            label="Accent Color"
            description="Accent color for notifications and special elements"
            placeholder="#f59e0b"
            value={localSettings.accent_color}
            onChange={(value) => updateLocalSetting("accent_color", value)}
          />
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
              updateLocalSetting("theme_applied_to_pdfs", checked)
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
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ColorFieldProps {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({
  id,
  label,
  description,
  placeholder,
  value,
  onChange,
}: ColorFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 h-10 p-1 cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
