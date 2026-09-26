"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Organization, TeamAdapter } from "../types/organization";

export type OrganizationsLoadStatus = "loading" | "error" | "success";

export interface UseOrganizationsResult {
  status: OrganizationsLoadStatus;
  organizations: Organization[];
  error: string | null;
  switchError: string | null;
  activeOrganizationId: string | null;
  setActiveOrganizationId: (organizationId: string) => void;
  reload: () => void;
  retryFailedSwitch: () => void;
}

/**
 * Loads the switchable organization list and the adapter's active
 * organization. Switching calls `setActiveOrganizationId` and only updates
 * local UI state after that write resolves. A rejected write leaves the
 * previous selection intact and surfaces `switchError` for a visible retry.
 */
export function useOrganizations(adapter: TeamAdapter): UseOrganizationsResult {
  const [status, setStatus] = useState<OrganizationsLoadStatus>("loading");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [failedSwitchOrganizationId, setFailedSwitchOrganizationId] = useState<
    string | null
  >(null);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<
    string | null
  >(null);
  const [reloadToken, setReloadToken] = useState(0);
  const switchEpochRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    setError(null);
    setSwitchError(null);
    setFailedSwitchOrganizationId(null);

    const loadEpoch = ++switchEpochRef.current;
    Promise.all([
      adapter.listOrganizations(),
      adapter.getActiveOrganizationId(),
    ])
      .then(async ([result, persistedId]) => {
        if (cancelled) return;
        setOrganizations(result);
        const validatedPersistedId =
          persistedId && result.some((org) => org.id === persistedId)
            ? persistedId
            : null;
        const targetId = validatedPersistedId ?? result[0]?.id ?? null;

        if (targetId && !validatedPersistedId) {
          try {
            await adapter.setActiveOrganizationId(targetId);
          } catch (err: unknown) {
            if (cancelled || switchEpochRef.current !== loadEpoch) return;
            setActiveOrganizationIdState(null);
            setFailedSwitchOrganizationId(targetId);
            setSwitchError(
              err instanceof Error
                ? err.message
                : "Could not switch organizations. Please try again.",
            );
            setStatus("success");
            return;
          }
        }

        if (cancelled || switchEpochRef.current !== loadEpoch) return;
        setActiveOrganizationIdState(targetId);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOrganizations([]);
        setActiveOrganizationIdState(null);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your organizations. Please try again.",
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
      if (switchEpochRef.current === loadEpoch) switchEpochRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, reloadToken]);

  const persistActiveOrganizationId = useCallback(
    (organizationId: string) => {
      const requestEpoch = ++switchEpochRef.current;
      setSwitchError(null);
      adapter
        .setActiveOrganizationId(organizationId)
        .then(() => {
          if (switchEpochRef.current !== requestEpoch) return;
          setActiveOrganizationIdState(organizationId);
          setFailedSwitchOrganizationId(null);
        })
        .catch((err: unknown) => {
          if (switchEpochRef.current !== requestEpoch) return;
          setFailedSwitchOrganizationId(organizationId);
          setSwitchError(
            err instanceof Error
              ? err.message
              : "Could not switch organizations. Please try again.",
          );
        });
    },
    [adapter],
  );

  const retryFailedSwitch = useCallback(() => {
    if (!failedSwitchOrganizationId) return;
    persistActiveOrganizationId(failedSwitchOrganizationId);
  }, [failedSwitchOrganizationId, persistActiveOrganizationId]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return {
    status,
    organizations,
    error,
    switchError,
    activeOrganizationId,
    setActiveOrganizationId: persistActiveOrganizationId,
    reload,
    retryFailedSwitch,
  };
}
