"use client";

import { useEffect, useState } from "react";
import type { TeamAdapter, TeamCapabilities } from "../types/organization";

export type TeamCapabilitiesLoadStatus = "loading" | "error" | "success";

export interface UseTeamCapabilitiesResult {
  status: TeamCapabilitiesLoadStatus;
  capabilities: TeamCapabilities | null;
  error: string | null;
}

/**
 * Fail-closed capability check for team features. Until this resolves to
 * `success` with `invitationsEnabled: true`, the invite flow must not be
 * presented as functional — see
 * docs/product/platform-build/CURSOR_R2_CONTRACT_REQUEST.md. A loading or
 * error state is treated the same as "disabled" by callers: no UI path may
 * assume invitations are enabled before this hook says so explicitly.
 */
export function useTeamCapabilities(
  adapter: TeamAdapter,
): UseTeamCapabilitiesResult {
  const [status, setStatus] = useState<TeamCapabilitiesLoadStatus>("loading");
  const [capabilities, setCapabilities] = useState<TeamCapabilities | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    setError(null);

    adapter
      .getCapabilities()
      .then((result) => {
        if (cancelled) return;
        setCapabilities(result);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCapabilities(null);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load team capabilities. Please try again.",
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  return { status, capabilities, error };
}
