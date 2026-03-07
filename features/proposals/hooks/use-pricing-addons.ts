import { useEffect, useState } from "react";
import { AddonItem } from "../types/pricing";
import { createClient } from "@/lib/supabase/client";

export function usePricingAddons(proposalId: string | undefined) {
  const supabase = createClient();
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [isLoadingAddons, setIsLoadingAddons] = useState(false);

  useEffect(() => {
    if (!proposalId) return;

    const fetchAddons = async () => {
      setIsLoadingAddons(true);
      try {
        const { data, error } = await supabase
          .from("proposal_additional_services")
          .select("*")
          .eq("proposal_id", proposalId)
          .order("created_at", { ascending: true });

        if (!error) setAddons((data as AddonItem[]) || []);
      } finally {
        setIsLoadingAddons(false);
      }
    };

    fetchAddons();
  }, [proposalId, supabase]);

  return { addons, isLoadingAddons };
}
