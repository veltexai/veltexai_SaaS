'use client';
import { Input } from '@/components/ui/input';
import type { CatalogJob } from '../schema';
export const COST_LABELS: Record<keyof CatalogJob['costs'], string> = {
  roundingIncrement: 'Round price up to ($)', crewSize: 'Crew size', wage: 'Hourly wage ($)', burdenPercent: 'Wage burden (%)', supplies: 'Supplies per visit ($)',
  equipment: 'Equipment / rental per visit ($)', travel: 'Travel / mobilization per visit ($)', minimumCharge: 'Minimum visit charge ($)',
  overheadPercent: 'Overhead on direct costs (%)', marginPercent: 'Target margin after overhead (%)', uncertaintyPercent: 'Labor uncertainty (±%)', laborHours: 'Override person-hours (optional)',
};
export function CostFields({ costs, onChange, legacy = false }: { legacy?: boolean; costs: CatalogJob['costs']; onChange: (costs: CatalogJob['costs']) => void }) {
  return <div className="grid gap-4 sm:grid-cols-2">{Object.entries(COST_LABELS).filter(([key]) => !legacy || key !== 'roundingIncrement').map(([key, label]) => <label key={key} className="space-y-1 text-sm">
    <span>{label}</span><Input type="number" min="0" step={key === 'crewSize' ? '1' : '0.01'} value={Number.isNaN(costs[key as keyof typeof costs]) ? '' : costs[key as keyof typeof costs] ?? ''}
      onChange={e => onChange({ ...costs, [key]: e.target.value === '' ? (key === 'laborHours' || key === 'roundingIncrement' ? undefined : NaN) : Number(e.target.value) })} />
  </label>)}</div>;
}
