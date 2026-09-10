"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { trackGoogleEvent } from "@/lib/analytics/google-analytics";

const FACILITIES = {
  office: { label: "General office", productivity: 3500, note: "Moderate density, recurring service" },
  medical: { label: "Medical office", productivity: 2200, note: "More touchpoints and protocol time" },
  education: { label: "School / education", productivity: 2800, note: "Mixed classrooms, restrooms, and corridors" },
  warehouse: { label: "Warehouse", productivity: 6000, note: "Large open areas with powered equipment" },
} as const;

type FacilityKey = keyof typeof FACILITIES;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function Field({ label, value, onChange, suffix, min, step = 1 }: { label: string; value: number; onChange: (value: number) => void; suffix: string; min: number; step?: number }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-blue-500"><input type="number" min={min} step={step} value={value} onChange={(event) => onChange(Math.max(min, Number(event.target.value) || min))} className="min-w-0 flex-1 px-3 py-3 outline-none" /><span className="flex items-center bg-slate-50 px-3 text-sm text-slate-500">{suffix}</span></div></label>;
}

export default function CommercialCleaningBenchmarkExplorer() {
  const used = useRef(false);
  const [facility, setFacility] = useState<FacilityKey>("office");
  const [squareFeet, setSquareFeet] = useState(20000);
  const [visits, setVisits] = useState(5);
  const [wage, setWage] = useState(17.71);
  const [burden, setBurden] = useState(25);
  const [overhead, setOverhead] = useState(15);
  const [margin, setMargin] = useState(20);

  const result = useMemo(() => {
    const profile = FACILITIES[facility];
    const hoursPerVisit = squareFeet / profile.productivity;
    const monthlyHours = hoursPerVisit * visits * 4.33;
    const burdenedRate = wage * (1 + burden / 100);
    const labor = monthlyHours * burdenedRate;
    const supplies = labor * 0.08;
    const operatingCost = (labor + supplies) * (1 + overhead / 100);
    const safeMargin = Math.min(margin, 80);
    const monthlyPrice = operatingCost / (1 - safeMargin / 100);
    return { ...profile, hoursPerVisit, monthlyHours, burdenedRate, labor, supplies, operatingCost, monthlyPrice, pricePerSquareFoot: monthlyPrice / squareFeet };
  }, [facility, squareFeet, visits, wage, burden, overhead, margin]);

  const markUsed = () => {
    if (!used.current) {
      used.current = true;
      trackGoogleEvent("use_benchmark_explorer", { facility_type: facility });
    }
  };

  return <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-2xl font-bold">Model your operating benchmark</h2><p className="mt-2 max-w-2xl text-slate-600">Change the assumptions to reflect your market, crew, scope, and service standard.</p></div><a href="/downloads/veltex-ai-2026-commercial-cleaning-benchmark-model.csv" download onClick={() => trackGoogleEvent("download_benchmark_dataset", { file_type: "csv" })} className="inline-flex shrink-0 items-center gap-2 font-bold text-blue-700"><Download className="h-4 w-4" /> Download CSV</a></div>
      <div className="mt-7"><label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="facility">Facility profile</label><select id="facility" value={facility} onChange={(event) => { markUsed(); setFacility(event.target.value as FacilityKey); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500">{Object.entries(FACILITIES).map(([key, item]) => <option key={key} value={key}>{item.label} — {item.productivity.toLocaleString()} sq. ft./labor hr</option>)}</select><p className="mt-2 text-sm text-slate-500">{result.note}. This is a Veltex planning assumption, not a universal industry rate.</p></div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Cleanable area" value={squareFeet} onChange={(value) => { markUsed(); setSquareFeet(value); }} suffix="sq. ft." min={500} step={500} />
        <Field label="Visits per week" value={visits} onChange={(value) => { markUsed(); setVisits(value); }} suffix="visits" min={1} />
        <Field label="Cleaner hourly wage" value={wage} onChange={(value) => { markUsed(); setWage(value); }} suffix="$/hr" min={1} step={0.25} />
        <Field label="Labor burden" value={burden} onChange={(value) => { markUsed(); setBurden(value); }} suffix="%" min={0} />
        <Field label="Overhead allocation" value={overhead} onChange={(value) => { markUsed(); setOverhead(value); }} suffix="%" min={0} />
        <Field label="Target operating margin" value={margin} onChange={(value) => { markUsed(); setMargin(value); }} suffix="%" min={1} />
      </div>
    </div>
    <aside className="h-fit rounded-2xl bg-blue-950 p-7 text-white shadow-xl sm:p-8 lg:sticky lg:top-6">
      <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">Modeled monthly price</p><p className="mt-3 text-5xl font-bold">{money.format(result.monthlyPrice)}</p><p className="mt-2 text-blue-200">{(result.pricePerSquareFoot * 100).toFixed(1)}¢ per cleanable sq. ft. per month</p>
      <dl className="mt-8 space-y-4 border-t border-blue-800 pt-6 text-sm"><div className="flex justify-between gap-4"><dt className="text-blue-200">Hours per visit</dt><dd className="font-semibold">{result.hoursPerVisit.toFixed(1)}</dd></div><div className="flex justify-between gap-4"><dt className="text-blue-200">Monthly labor hours</dt><dd className="font-semibold">{result.monthlyHours.toFixed(1)}</dd></div><div className="flex justify-between gap-4"><dt className="text-blue-200">Burdened hourly labor</dt><dd className="font-semibold">{money.format(result.burdenedRate)}</dd></div><div className="flex justify-between gap-4"><dt className="text-blue-200">Labor + modeled supplies</dt><dd className="font-semibold">{money.format(result.labor + result.supplies)}</dd></div><div className="flex justify-between gap-4"><dt className="text-blue-200">Cost after overhead</dt><dd className="font-semibold">{money.format(result.operatingCost)}</dd></div></dl>
      <Link href="/tools/cleaning-bid-calculator" onClick={() => trackGoogleEvent("benchmark_to_calculator", { facility_type: facility, modeled_monthly_price: Math.round(result.monthlyPrice) })} className="mt-8 flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 font-bold text-emerald-950 hover:bg-emerald-300">Build a detailed bid <ArrowRight className="h-4 w-4" /></Link>
      <p className="mt-4 text-xs leading-5 text-blue-300">Planning model only. It excludes job-specific taxes, travel, equipment purchases, consumables, unusual conditions, and local requirements.</p>
    </aside>
  </div>;
}
