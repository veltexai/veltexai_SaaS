import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, ClipboardList, FileCheck2, Map } from "lucide-react";
import { SOLUTIONS } from "@/features/solutions/content";

export const metadata: Metadata = {
  title: "Commercial Cleaning Proposal and Bidding Software Solutions",
  description: "Choose a Veltex AI workflow for janitorial estimating, commercial cleaning proposals, offices, medical practices, warehouses, and post-construction projects.",
  alternates: { canonical: "/solutions" },
};

const paths = [
  { icon: Calculator, title: "I need to build the number", body: "Start with labor, frequency, overhead, and margin assumptions before creating the customer document.", label: "Explore janitorial bidding", href: "/solutions/janitorial-bidding-software" },
  { icon: FileCheck2, title: "I need to present the offer", body: "Turn an approved estimate and walkthrough into a readable commercial scope, price, and proposal.", label: "Explore proposal software", href: "/solutions/commercial-cleaning-proposal-software" },
  { icon: Map, title: "I need a facility-specific scope", body: "Use the operating conditions of an office, medical practice, warehouse, or project site to shape the proposal.", label: "Compare facility workflows", href: "#facility-workflows" },
];

export default function SolutionsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 px-4 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="text-sm font-semibold text-blue-200 hover:text-white">← Veltex AI</Link>
          <p className="mt-12 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Cleaning-specific workflows</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold leading-tight sm:text-6xl">Build the estimate. Define the scope. Present the proposal.</h1>
          <p className="mt-6 max-w-3xl text-xl leading-8 text-blue-100">Veltex AI helps commercial cleaning companies organize the work between a facility walkthrough and a customer-ready offer. Choose the path that matches the decision you are making now.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/tools/cleaning-bid-calculator" className="rounded-lg bg-white px-6 py-3 font-bold text-blue-900">Use the free calculator</Link><Link href="/demo-proposal" className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-6 py-3 font-bold">Try a proposal demo<ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-wider text-blue-700">Choose by job to be done</p><h2 className="mt-3 text-3xl font-bold">Where are you in the bidding workflow?</h2><p className="mt-5 text-lg leading-8 text-slate-600">Estimating and proposal creation are connected, but they are not the same task. Start with the problem that is blocking the bid.</p></div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">{paths.map(({ icon: Icon, ...path }) => <article key={path.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-800"><Icon className="h-6 w-6" /></div><h3 className="mt-5 text-xl font-bold">{path.title}</h3><p className="mt-3 flex-1 leading-7 text-slate-600">{path.body}</p><Link href={path.href} className="mt-6 inline-flex items-center gap-2 font-bold text-blue-700">{path.label}<ArrowRight className="h-4 w-4" /></Link></article>)}</div>
      </section>

      <section className="bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-6xl"><div className="max-w-3xl"><ClipboardList className="h-9 w-9 text-emerald-300" /><h2 className="mt-5 text-3xl font-bold">One controlled path from walkthrough to proposal</h2><p className="mt-5 text-lg leading-8 text-slate-300">Veltex AI does not replace the estimator's judgment. It creates a consistent place to record, review, and present the decisions behind the bid.</p></div>
          <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{[
            ["1", "Capture", "Record facility details, areas, surfaces, traffic, access, and customer requirements."],
            ["2", "Estimate", "Review production, labor, frequency, overhead, margin, and scope risk using your verified inputs."],
            ["3", "Structure", "Separate recurring work, periodic services, options, exclusions, and customer responsibilities."],
            ["4", "Approve", "Check the complete offer, then create and send the customer-facing proposal under your control."],
          ].map(([number, title, body]) => <li key={number} className="rounded-xl border border-slate-700 bg-slate-900 p-6"><span className="text-sm font-bold text-emerald-300">STEP {number}</span><h3 className="mt-3 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-slate-300">{body}</p></li>)}</ol>
        </div>
      </section>

      <section id="facility-workflows" className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-wider text-blue-700">Solution library</p><h2 className="mt-3 text-3xl font-bold">Choose the workflow that matches the contract</h2><p className="mt-5 text-lg leading-8 text-slate-600">Each guide addresses a different estimating or operating problem. Examples are illustrative and must be replaced with your verified walkthrough conditions and company inputs.</p></div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">{SOLUTIONS.map((solution) => <article key={solution.slug} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">{solution.intentLabel}</p><h3 className="mt-3 text-2xl font-bold leading-snug">{solution.title}</h3><p className="mt-4 flex-1 leading-7 text-slate-600">{solution.description}</p><p className="mt-5 border-t border-slate-100 pt-5 text-sm font-semibold text-slate-500">For {solution.audience.toLowerCase()}</p><Link href={`/solutions/${solution.slug}`} className="mt-5 inline-flex items-center gap-2 font-bold text-blue-700">Explore this workflow<ArrowRight className="h-4 w-4" /></Link></article>)}</div>
      </section>

      <section className="bg-blue-950 px-4 py-16 text-white"><div className="mx-auto max-w-4xl text-center"><h2 className="text-3xl font-bold">Start with a real walkthrough, not a generic template</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">Use the calculator to test an estimate or open the demo to see how reviewed inputs become a proposal.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/tools/cleaning-bid-calculator" className="rounded-lg bg-emerald-400 px-6 py-3 font-bold text-emerald-950">Calculate a cleaning bid</Link><Link href="/demo-proposal" className="rounded-lg border border-blue-300 px-6 py-3 font-bold">View the proposal demo</Link></div></div></section>
    </main>
  );
}
