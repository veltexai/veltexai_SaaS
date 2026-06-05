export function formatCurrency(
  amount: number,
  currency: string = "usd",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "...";
}
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Robust currency formatter for string or number inputs
export function formatCurrencySafe(
  input: string | number | null | undefined,
  currency: string = "usd",
): string {
  const toNumber = (v: string | number | null | undefined): number => {
    if (v == null) return 0;
    if (typeof v === "number") return v;
    // Strip currency symbols, commas, and text like "monthly cost"
    const cleaned = v.replace(/[^0-9.-]/g, "");
    const n = parseFloat(cleaned);
    return isFinite(n) && !isNaN(n) ? n : 0;
  };

  try {
    return formatCurrency(toNumber(input), currency);
  } catch {
    const n = toNumber(input);
    // Fallback: keep two decimals without locale currency symbol handling
    return `$${n.toFixed(2)}`;
  }
}
