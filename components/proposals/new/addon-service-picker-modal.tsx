'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

type CatalogRow = {
  id: string;
  sku: string;
  label: string;
  unit_type: 'sqft' | 'pane' | 'visit' | 'hour' | 'flat';
  rate: number;
  min_qty: number;
  default_frequency: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  frequency_options: string[];
  amortize_to_monthly: boolean;
  default_qty_source: string;
};

type PASRow = {
  id: string;
  proposal_id: string;
  sku: string;
  label: string;
  unit_type: string;
  rate: number;
  qty: number;
  min_qty: number;
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  subtotal: number;
  monthly_amount: number | null;
  notes: string | null;
};

interface AddonServicePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId?: string;
  onAdded: (row: PASRow) => void;
}

export function AddonServicePickerModal({
  open,
  onOpenChange,
  proposalId,
  onAdded,
}: AddonServicePickerModalProps) {
  const supabase = createClient();
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string>('');
  const selected = useMemo(
    () => catalog.find((c) => c.sku === selectedSku) || null,
    [catalog, selectedSku]
  );
  const [qty, setQty] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('additional_service_catalog')
          .select('*')
          .eq('active', true)
          .eq('show_in_proposals', true)
          .order('label', { ascending: true });
        if (error) throw error;
        setCatalog((data || []) as CatalogRow[]);
      } catch (err) {
        toast.error('Failed to load add-on catalog');
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [open, supabase]);

  useEffect(() => {
    if (!selected) return;
    setFrequency(selected.default_frequency);
  }, [selected]);

  const computeAmounts = (
    q: number,
    rate: number,
    freq: string,
    amortize: boolean
  ) => {
    const subtotal = q * rate;
    const freqMap: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      annual: 12,
    };
    const months = freqMap[freq] || 1;
    const monthly_amount =
      freq === 'one_time'
        ? null
        : amortize
        ? subtotal / months
        : freq === 'monthly'
        ? subtotal
        : null;
    return { subtotal, monthly_amount };
  };

  const handleSubmit = async () => {
    try {
      if (!selected) {
        toast.error('Select a service');
        return;
      }
      const parsedQty = parseFloat(qty);
      if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
        toast.error('Enter a valid quantity');
        return;
      }
      if (!frequency) {
        toast.error('Select a frequency');
        return;
      }
      setSubmitting(true);
      if (proposalId) {
        const { subtotal, monthly_amount } = computeAmounts(
          parsedQty,
          selected.rate,
          frequency,
          !!selected.amortize_to_monthly
        );
        const insertPayload = {
          proposal_id: proposalId,
          sku: selected.sku,
          label: selected.label,
          unit_type: selected.unit_type,
          rate: selected.rate,
          qty: parsedQty,
          min_qty: selected.min_qty,
          frequency,
          subtotal,
          monthly_amount,
        };
        const { data, error } = await supabase
          .from('proposal_additional_services')
          .insert(insertPayload)
          .select('*')
          .single();
        if (error) throw error;
        onAdded(data as PASRow);
        toast.success('Add-on service added');
      } else {
        const { subtotal, monthly_amount } = computeAmounts(
          parsedQty,
          selected.rate,
          frequency,
          !!selected.amortize_to_monthly
        );
        const row: PASRow = {
          id: `temp_${Date.now()}`,
          proposal_id: '',
          sku: selected.sku,
          label: selected.label,
          unit_type: selected.unit_type,
          rate: selected.rate,
          qty: parsedQty,
          min_qty: selected.min_qty,
          frequency: frequency as PASRow['frequency'],
          subtotal,
          monthly_amount,
          notes: null,
        };
        onAdded(row);
        toast.success('Add-on service added');
      }
      setSelectedSku('');
      setQty('');
      setFrequency('');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to add service');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add-on Services</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedSku} onValueChange={setSelectedSku}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={loading ? 'Loading...' : 'Choose a service'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map((item) => (
                    <SelectItem key={item.sku} value={item.sku}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selected && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span>Unit Type</span>
                      <span className="font-medium">{selected.unit_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rate</span>
                      <span className="font-medium">
                        ${selected.rate.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min Qty</span>
                      <span className="font-medium">{selected.min_qty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Default Frequency</span>
                      <span className="font-medium">
                        {selected.default_frequency}
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <span className="text-sm">Quantity</span>
                      <Input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        placeholder={
                          selected.unit_type === 'sqft'
                            ? 'e.g., 5000'
                            : 'Enter quantity'
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm">Frequency</span>
                      <Select value={frequency} onValueChange={setFrequency}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          {(selected.frequency_options || []).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedSku}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
