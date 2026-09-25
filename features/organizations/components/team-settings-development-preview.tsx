"use client";

import { useMemo } from "react";
import { resolveTeamAdapter } from "../lib/resolve-team-adapter";
import type { MockTeamScenario } from "../lib/mock-team-adapter";
import { TeamSettingsShell } from "./team-settings-shell";

export interface TeamSettingsDevelopmentPreviewProps {
  scenario?: MockTeamScenario;
}

/**
 * Development-only mock preview. The production team page must never import
 * this module — `app/dashboard/settings/team/page.tsx` loads it only inside
 * a `NODE_ENV === "development"` branch so fixture data cannot reach a
 * production render.
 */
export function TeamSettingsDevelopmentPreview({
  scenario,
}: TeamSettingsDevelopmentPreviewProps) {
  const adapter = useMemo(
    () => resolveTeamAdapter("development", scenario),
    [scenario],
  );

  return <TeamSettingsShell adapter={adapter} />;
}
