export type AddonFrequency = "one_time" | "monthly" | "quarterly" | "annual";
export type PASRow = {
  id: string;
  proposal_id: string;
  sku: string;
  label: string;
  unit_type: string;
  rate: number;
  qty: number;
  min_qty: number;
  frequency: "one_time" | "monthly" | "quarterly" | "annual";
  subtotal: number;
  monthly_amount: number | null;
  notes: string | null;
};
