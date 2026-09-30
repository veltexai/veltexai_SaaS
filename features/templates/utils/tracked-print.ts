import { formatCurrencySafe } from '@/lib/utils/format';

type TrackedAdditionalService = {
  service?: string | null;
  frequency?: string | null;
  subtotal?: number | string | null;
  monthly_amount?: number | string | null;
};

export function normalizeTrackedExtras(rows: unknown) {
  if (!Array.isArray(rows)) return undefined;
  return (rows as TrackedAdditionalService[]).map((row) => {
    const subtotal = Number(row.subtotal) || 0;
    const frequency = String(row.frequency || '').toLowerCase();
    const derivedMonthly =
      frequency === 'monthly'
        ? subtotal
        : frequency === 'quarterly'
          ? subtotal / 3
          : frequency === 'annual'
            ? subtotal / 12
            : null;
    const monthly =
      row.monthly_amount == null
        ? derivedMonthly
        : Number(row.monthly_amount);
    return {
      service: row.service || '',
      pricePerTime: formatCurrencySafe(subtotal),
      pricePerMonth: monthly == null ? null : formatCurrencySafe(monthly),
    };
  });
}

export function normalizeTrackedColor(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : fallback;
}
