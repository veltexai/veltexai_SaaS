"use client";

import { useCallback, useState } from "react";
import type {
  InviteMemberInput,
  InviteMemberResult,
  TeamAdapter,
} from "../types/organization";

export type InviteMemberStatus = "idle" | "loading" | "error" | "success";

export interface UseInviteMemberResult {
  status: InviteMemberStatus;
  error: string | null;
  invite: (input: InviteMemberInput) => Promise<InviteMemberResult | null>;
  reset: () => void;
}

export function useInviteMember(adapter: TeamAdapter): UseInviteMemberResult {
  const [status, setStatus] = useState<InviteMemberStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const invite = useCallback(
    async (input: InviteMemberInput) => {
      setStatus("loading");
      setError(null);

      try {
        const result = await adapter.inviteMember(input);
        setStatus("success");
        return result;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not send the invite. Please try again.",
        );
        setStatus("error");
        return null;
      }
    },
    [adapter],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, invite, reset };
}
