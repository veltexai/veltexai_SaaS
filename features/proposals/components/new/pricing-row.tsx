interface PricingRowProps {
  label: string;
  value: string;
}

export function PricingRow({ label, value }: PricingRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
