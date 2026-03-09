// features/proposals/hooks/use-proposal-addons.ts
import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PASRow, AddonFrequency } from "../types/addons";
import {
  calculateMonthlyTotal,
  normalizeAddons,
} from "../utils/addon-calculations";

interface UseProposalAddonsOptions {
  proposalId?: string;
  initialAddons?: PASRow[];
  onExternalChange?: (addons: PASRow[]) => void;
}

interface UseProposalAddonsReturn {
  addons: PASRow[];
  loadingAddons: boolean;
  monthlyAddonsTotal: number;
  handleDeleteAddon: (id: string) => Promise<void>;
  handleAddonAdded: (row: PASRow) => void;
}

export function useProposalAddons({
  proposalId,
  initialAddons,
  onExternalChange,
}: UseProposalAddonsOptions): UseProposalAddonsReturn {
  const supabase = createClient();
  const [addons, setAddons] = useState<PASRow[]>(() => initialAddons ?? []);
  const [loadingAddons, setLoadingAddons] = useState(false);

  useEffect(() => {
    if (!proposalId) return;

    const fetchAddons = async () => {
      setLoadingAddons(true);
      try {
        const { data, error } = await supabase
          .from("proposal_additional_services")
          .select("*")
          .eq("proposal_id", proposalId)
          .order("created_at", { ascending: true });

        if (error) return;

        const normalized = normalizeAddons(data ?? []);
        setAddons(normalized);
        onExternalChange?.(normalized);
      } finally {
        setLoadingAddons(false);
      }
    };

    fetchAddons();
  }, [proposalId]);

  const monthlyAddonsTotal = useMemo(
    () => calculateMonthlyTotal(addons),
    [addons],
  );

  const handleDeleteAddon = useCallback(
    async (id: string) => {
      const previous = addons;
      const updated = addons.filter((a) => a.id !== id);
      setAddons(updated);
      onExternalChange?.(updated);

      if (!proposalId) return;

      const { error } = await supabase
        .from("proposal_additional_services")
        .delete()
        .eq("id", id);

      if (error) {
        setAddons(previous);
        onExternalChange?.(previous);
      }
    },
    [addons, proposalId, supabase, onExternalChange],
  );

  const handleAddonAdded = useCallback(
    (row: PASRow) => {
      setAddons((prev) => {
        const next = [...prev, row];
        onExternalChange?.(next);
        return next;
      });
    },
    [onExternalChange],
  );

  return {
    addons,
    loadingAddons,
    monthlyAddonsTotal,
    handleDeleteAddon,
    handleAddonAdded,
  };
}
