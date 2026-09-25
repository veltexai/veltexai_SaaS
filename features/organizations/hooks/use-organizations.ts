"use client";

import { useCallback, useEffect, useState } from "react";
import type { Organization, TeamAdapter } from "../types/organization";

export type OrganizationsLoadStatus = "loading" | "error" | "success";

export interface UseOrganizationsResult {
  status: OrganizationsLoadStatus;
  organizations: Organization[];
  error: string | null;
  activeOrganizationId: string | null;
  setActiveOrganizationId: (organizationId: string) => void;
  reload: () => void;
}

/**
 * Loads the switchable organization list and tracks which one is active in
 * the UI. Selection is local-only in this shell — persisting the active
 * organization server-side is part of the Codex contract request.
 */
export function useOrganizations(adapter: TeamAdapter): UseOrganizationsResult {
  const [status, setStatus] = useState<OrganizationsLoadStatus>("loading");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<
    string | null
  >(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    setError(null);

    adapter
      .listOrganizations()
      .then((result) => {
        if (cancelled) return;
        setOrganizations(result);
        setStatus("success");
        setActiveOrganizationIdState((current) => {
          if (current && result.some((org) => org.id === current)) {
            return current;
          }
          return result[0]?.id ?? null;
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your organizations. Please try again.",
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, reloadToken]);

  const setActiveOrganizationId = useCallback((organizationId: string) => {
    setActiveOrganizationIdState(organizationId);
  }, []);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return {
    status,
    organizations,
    error,
    activeOrganizationId,
    setActiveOrganizationId,
    reload,
  };
}
