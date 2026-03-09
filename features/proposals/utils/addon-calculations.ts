// features/proposals/utils/addon-calculations.ts
import type { PASRow, AddonFrequency } from "@/features/proposals/types/addons";

const MONTHS_BY_FREQUENCY: Record<AddonFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
  one_time: 12,
};

export function normalizeAddon(raw: Record<string, unknown>): PASRow {
  const rate = Number(raw.rate);
  const qty = Number(raw.qty);
  const subtotal = Number.isFinite(Number(raw.subtotal))
    ? Number(raw.subtotal)
    : rate * qty;

  const frequency = String(raw.frequency ?? "").toLowerCase() as AddonFrequency;
  const rawMonthly =
    raw.monthly_amount != null ? Number(raw.monthly_amount) : NaN;
  const monthly_amount = Number.isFinite(rawMonthly)
    ? rawMonthly
    : frequency === "monthly"
      ? subtotal
      : null;

  return { ...(raw as PASRow), subtotal, monthly_amount };
}

export function normalizeAddons(rows: Record<string, unknown>[]): PASRow[] {
  return rows.map(normalizeAddon);
}

export function calculateMonthlyTotal(addons: PASRow[]): number {
  return addons.reduce((sum, addon) => {
    if (addon.monthly_amount !== null) return sum + addon.monthly_amount;

    const months = MONTHS_BY_FREQUENCY[addon.frequency] ?? 0;
    if (months === 0) return sum;

    const base = Number.isFinite(addon.subtotal)
      ? addon.subtotal
      : addon.rate * addon.qty;

    return sum + base / months;
  }, 0);
}
