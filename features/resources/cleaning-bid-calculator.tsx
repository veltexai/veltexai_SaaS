"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { trackGoogleEvent } from "@/lib/analytics/google-analytics";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function NumberField({ label, value, onChange, suffix, min = 0, step = 1 }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; min?: number; step?: number }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-blue-500"><input className="min-w-0 flex-1 px-3 py-3 outline-none" type="number" min={min} step={step} value={value} onChange={(event) => onChange(Math.max(min, Number(event.target.value) || 0))} />{suffix && <span className="flex items-center bg-slate-50 px-3 text-sm text-slate-500">{suffix}</span>}</div></label>;
}

export default function CleaningBidCalculator() {
  const hasTrackedUse = useRef(false);
  const [hours, setHours] = useState(5);
  const [visits, setVisits] = useState(3);
  const [wage, setWage] = useState(18);
  const [burden, setBurden] = useState(22);
  const [supplies, setSupplies] = useState(250);
  const [overhead, setOverhead] = useState(12);
  const [margin, setMargin] = useState(20);

  const result = useMemo(() => {
    const monthlyVisits = visits * 4.33;
    const monthlyHours = hours * monthlyVisits;
    const labor = monthlyHours * wage * (1 + burden / 100);
    const directCost = labor + supplies;
    const totalCost = directCost * (1 + overhead / 100);
    const safeMargin = Math.min(margin, 80);
    const price = totalCost / (1 - safeMargin / 100);
    return { monthlyVisits, monthlyHours, labor, totalCost, price, perVisit: monthlyVisits ? price / monthlyVisits : 0 };
  }, [hours, visits, wage, burden, supplies, overhead, margin]);

  useEffect(() => {
    if (!hasTrackedUse.current) return;
    const timeout = window.setTimeout(() => {
      trackGoogleEvent("use_bid_calculator", {
        visits_per_week: visits,
        target_margin: margin,
      });
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [visits, margin, hours, wage, burden, supplies, overhead]);

  const markUsed = () => { hasTrackedUse.current = true; };

  return <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-bold">Job inputs</h2><p className="mt-2 text-slate-600">Use your actual production plan and costs. Estimates are for planning only.</p><div className="mt-7 grid gap-5 sm:grid-cols-2">
      <NumberField label="Labor hours per visit" value={hours} onChange={(value) => { markUsed(); setHours(value); }} step={0.25} suffix="hours" />
      <NumberField label="Visits per week" value={visits} onChange={(value) => { markUsed(); setVisits(value); }} min={1} suffix="visits" />
      <NumberField label="Hourly wage" value={wage} onChange={(value) => { markUsed(); setWage(value); }} step={0.5} suffix="$/hr" />
      <NumberField label="Payroll burden" value={burden} onChange={(value) => { markUsed(); setBurden(value); }} suffix="%" />
      <NumberField label="Supplies & equipment / month" value={supplies} onChange={(value) => { markUsed(); setSupplies(value); }} step={25} suffix="$" />
      <NumberField label="Overhead allocation" value={overhead} onChange={(value) => { markUsed(); setOverhead(value); }} suffix="%" />
      <NumberField label="Target profit margin" value={margin} onChange={(value) => { markUsed(); setMargin(value); }} min={1} suffix="%" />
    </div></div>
    <aside className="h-fit rounded-2xl bg-blue-950 p-7 text-white shadow-xl sm:p-8 lg:sticky lg:top-6"><p className="text-sm font-bold uppercase tracking-wider text-blue-300">Recommended monthly price</p><p className="mt-3 text-5xl font-bold">{money.format(result.price)}</p><p className="mt-2 text-blue-200">About {money.format(result.perVisit)} per visit</p><dl className="mt-8 space-y-4 border-t border-blue-800 pt-6"><div className="flex justify-between gap-4"><dt className="text-blue-200">Monthly visits</dt><dd className="font-semibold">{result.monthlyVisits.toFixed(1)}</dd></div><div className="flex justify-between gap-4"><dt className="text-blue-200">Monthly labor hours</dt><dd className="font-semibold">{result.monthlyHours.toFixed(1)}</dd></div><div className="flex justify-between gap-4"><dt className="text-blue-200">Burdened labor</dt><dd className="font-semibold">{money.format(result.labor)}</dd></div><div className="flex justify-between gap-4"><dt className="text-blue-200">Estimated monthly cost</dt><dd className="font-semibold">{money.format(result.totalCost)}</dd></div></dl><Link href="/demo-proposal" onClick={() => trackGoogleEvent("calculator_to_demo", { estimated_monthly_price: Math.round(result.price) })} className="mt-8 block rounded-lg bg-emerald-500 px-5 py-3 text-center font-bold text-emerald-950 hover:bg-emerald-400">Turn this estimate into a proposal</Link><p className="mt-4 text-xs leading-5 text-blue-300">This calculator does not account for taxes, local rules, unusual scope conditions, or every business cost. Validate the result before quoting a customer.</p></aside>
  </div>;
}
