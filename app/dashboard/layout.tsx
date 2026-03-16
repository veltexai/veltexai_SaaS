import { redirect } from "next/navigation";
import { getUser } from "@/queries/user";
import { DashboardClientLayout } from "@/components/layout/dashboard-client-layout";
import { getUserBrandingSettings } from "@/features/settings";
import { applyTheme } from "@/lib/theme";
import { ProfileUserBrandingProvider } from "@/providers/profile-user-branding-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const brandingSettings = await getUserBrandingSettings(user.id);
  return (
    <ProfileUserBrandingProvider value={{ brandingSettings, user, profile }}>
      <DashboardClientLayout>{children}</DashboardClientLayout>
    </ProfileUserBrandingProvider>
  );
}
