import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";
import { getUserBrandingSettings } from "@/features/settings/services/get-user-branding-serttings";
import { BrandingSettingsForm } from "./branding-settings-form";

interface BrandingSettingsCardProps {
  userId: string;
}

export default async function BrandingSettingsCard({
  userId,
}: BrandingSettingsCardProps) {
  const settings = await getUserBrandingSettings(userId);

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
        </div>
      </CardHeader>
      <CardContent>
        <BrandingSettingsForm initialSettings={settings} />
      </CardContent>
    </Card>
  );
}
