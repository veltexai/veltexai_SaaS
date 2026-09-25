"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrganizationMember, TeamAdapter } from "../types/organization";

export type TeamMembersLoadStatus = "idle" | "loading" | "error" | "success";

export interface UseTeamMembersResult {
  status: TeamMembersLoadStatus;
  members: OrganizationMember[];
  error: string | null;
  reload: () => void;
  /** Optimistically append a member without a full refetch (used after invite). */
  addMember: (member: OrganizationMember) => void;
}

/**
 * Loads the member list for the active organization. Returns "idle" when
 * there is no active organization yet (e.g. organizations are still loading).
 */
export function useTeamMembers(
  adapter: TeamAdapter,
  organizationId: string | null,
): UseTeamMembersResult {
  const [status, setStatus] = useState<TeamMembersLoadStatus>(
    organizationId ? "loading" : "idle",
  );
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!organizationId) {
      setStatus("idle");
      setMembers([]);
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(null);

    adapter
      .listMembers(organizationId)
      .then((result) => {
        if (cancelled) return;
        setMembers(result);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load team members. Please try again.",
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, organizationId, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const addMember = useCallback((member: OrganizationMember) => {
    setMembers((current) => [...current, member]);
    setStatus("success");
  }, []);

  return { status, members, error, reload, addMember };
}
