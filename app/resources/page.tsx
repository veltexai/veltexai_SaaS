import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Calculator, Download } from "lucide-react";
import { RESOURCES } from "@/features/resources/content";

export const metadata: Metadata = {
  title: "Commercial Cleaning Bidding Resources",
  description: "Practical guides, checklists, and tools for writing janitorial proposals, pricing commercial cleaning jobs, and winning profitable contracts.",
  alternates: { canonical: "/resources" },
};

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-gradient-to-br from-blue-950 to-blue-700 px-4 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="text-sm font-semibold text-blue-100">← Veltex AI</Link>
          <p className="mt-12 text-sm font-bold uppercase tracking-[0.2em] text-blue-200">Free resource center</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">Bid smarter. Price for profit. Send proposals faster.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100">Field-tested guidance for commercial cleaning and janitorial companies—from the walkthrough to the signed proposal.</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <article className="mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 to-emerald-800 p-8 text-white shadow-xl sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]"><div><p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-300"><BarChart3 className="h-5 w-5" /> Featured original research</p><h2 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">2026 Commercial Cleaning Pricing and Production Rate Benchmark Report</h2><p className="mt-4 max-w-3xl text-lg leading-8 text-blue-100">Explore editable labor, facility, frequency, overhead, and margin benchmarks. Inspect the full methodology and download the modeled dataset.</p></div><div className="flex flex-col gap-3"><Link href="/resources/commercial-cleaning-benchmark-report" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 font-bold text-blue-800">Read the report <ArrowRight className="h-4 w-4" /></Link><a href="/downloads/veltex-ai-2026-commercial-cleaning-benchmark-model.csv" download className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 px-5 py-3 font-bold"><Download className="h-4 w-4" /> Download CSV</a></div></div>
        </article>
        <Link href="/tools/cleaning-bid-calculator" className="mb-10 flex flex-col gap-5 rounded-2xl bg-emerald-600 p-7 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4"><Calculator className="mt-1 h-8 w-8 shrink-0" /><div><p className="text-sm font-bold uppercase tracking-wider text-emerald-100">Free interactive tool</p><h2 className="mt-1 text-2xl font-bold">Commercial Cleaning Bid Calculator</h2><p className="mt-2 text-emerald-50">Model labor, monthly cost, margin, and recommended price—no signup required.</p></div></div>
          <ArrowRight className="h-7 w-7 shrink-0" />
        </Link>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.map((resource) => (
            <article key={resource.slug} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{resource.eyebrow} · {resource.readTime}</p>
              <h2 className="mt-3 text-xl font-bold leading-snug">{resource.title}</h2>
              <p className="mt-3 flex-1 leading-7 text-slate-600">{resource.description}</p>
              <Link href={`/resources/${resource.slug}`} className="mt-6 inline-flex items-center gap-2 font-semibold text-blue-700">Read guide <ArrowRight className="h-4 w-4" /></Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
