import type { Metadata } from "next";
import { TeamSettingsShell } from "@/features/organizations/components/team-settings-shell";
import type { MockTeamScenario } from "@/features/organizations/lib/mock-team-adapter";

export const metadata: Metadata = {
  title: "Team settings",
  robots: { index: false, follow: false },
};

interface TeamSettingsPageProps {
  // `?scenario=empty|error` is development-only preview plumbing. The
  // production branch below never reads it, so a query string cannot
  // activate fixtures or scenario overrides once this page is built for
  // production.
  searchParams: Promise<{ scenario?: string }>;
}

function toScenario(value: string | undefined): MockTeamScenario | undefined {
  return value === "empty" || value === "error" ? value : undefined;
}

/**
 * This page never constructs a mock adapter and never passes a class
 * instance across the RSC boundary. In production, the client shell creates
 * its authenticated HTTP adapter. The mock preview is development-only.
 */
export default async function TeamSettingsPage({
  searchParams,
}: TeamSettingsPageProps) {
  if (process.env.NODE_ENV === "development") {
    const { TeamSettingsDevelopmentPreview } = await import(
      "@/features/organizations/components/team-settings-development-preview"
    );
    const params = await searchParams;
    return (
      <div className="space-y-6">
        <TeamSettingsDevelopmentPreview scenario={toScenario(params.scenario)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TeamSettingsShell />
    </div>
  );
}
