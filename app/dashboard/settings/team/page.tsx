import type { Metadata } from "next";
import { TeamSettingsShell } from "@/features/organizations/components/team-settings-shell";
import type { MockTeamScenario } from "@/features/organizations/lib/mock-team-adapter";

export const metadata: Metadata = {
  title: "Team settings",
  robots: { index: false, follow: false },
};

interface TeamSettingsPageProps {
  // `?scenario=empty|error|default` lets reviewers preview the member list's
  // empty/error states without wiring a real backend. Not part of any
  // server contract — purely a local mock-adapter switch for this shell.
  searchParams: Promise<{ scenario?: string }>;
}

function toScenario(value: string | undefined): MockTeamScenario | undefined {
  return value === "empty" || value === "error" ? value : undefined;
}

export default async function TeamSettingsPage({
  searchParams,
}: TeamSettingsPageProps) {
  const params = await searchParams;
  const scenario = toScenario(params.scenario);

  return (
    <div className="space-y-6">
      <TeamSettingsShell mockOptions={scenario ? { scenario, latencyMs: 300 } : undefined} />
    </div>
  );
}
