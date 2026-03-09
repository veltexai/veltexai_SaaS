"use client";

import { useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Plus, Trash2 } from "lucide-react";
import { AddonServicePickerModal } from "../addon-service-picker-modal";
import { useProposalAddons } from "../../../hooks/use-proposal-addons";
import type { ProposalFormData } from "@/lib/validations/proposal";
import type { PASRow } from "../../../types/addons";

interface AddonServicesCardProps {
  proposalId?: string;
}

export function AddonServicesCard({ proposalId }: AddonServicesCardProps) {
  const form = useFormContext<ProposalFormData>();
  const [pickerOpen, setPickerOpen] = useState(false);

  const syncToForm = useCallback(
    (updated: PASRow[]) => {
      form.setValue("selected_addons" as any, updated, { shouldDirty: true });
    },
    [form],
  );

  const savedAddons = form.getValues("selected_addons" as any) as
    | PASRow[]
    | undefined;

  const {
    addons,
    loadingAddons,
    monthlyAddonsTotal,
    handleDeleteAddon,
    handleAddonAdded,
  } = useProposalAddons({
    proposalId,
    initialAddons: savedAddons,
    onExternalChange: syncToForm,
  });
  // #region agent log
  console.log('[DEBUG-a3a74d] H3: addons in AddonServicesCard', JSON.stringify({proposalId:proposalId||null,addonsCount:addons.length,addonLabels:addons.map((a:any)=>a.label)}));
  // #endregion

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Add-on Services</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {loadingAddons
              ? "Loading services..."
              : addons.length === 0
                ? "No add-ons selected"
                : `${addons.length} add-on${addons.length > 1 ? "s" : ""} selected`}
          </div>
          <Button onClick={() => setPickerOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>

        {addons.length > 0 && (
          <div className="space-y-3">
            {addons.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="font-medium">{a.label}</div>
                  <div className="text-xs text-muted-foreground">
                    Qty {a.qty} {a.unit_type} • Rate ${a.rate.toFixed(2)} •{" "}
                    {a.frequency === "one_time" ? "one time" : a.frequency}
                  </div>
                  <div className="text-sm">
                    {a.monthly_amount !== null ? (
                      <span className="font-semibold">
                        Monthly: ${a.monthly_amount.toFixed(2)}
                      </span>
                    ) : (
                      <span className="font-semibold">
                        One-time: ${a.subtotal.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDeleteAddon(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Separator />
            {monthlyAddonsTotal > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm">Monthly Add-ons Total</span>
                <span className="text-lg font-semibold">
                  ${monthlyAddonsTotal.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        <AddonServicePickerModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          proposalId={proposalId}
          onAdded={handleAddonAdded}
        />
      </CardContent>
    </Card>
  );
}
