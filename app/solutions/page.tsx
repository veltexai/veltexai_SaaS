import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SOLUTIONS } from "@/features/solutions/content";

export const metadata: Metadata = {
  title: "Cleaning Proposal Software Solutions",
  description: "Proposal and bidding workflows for commercial cleaning, janitorial, office, medical, post-construction, and warehouse cleaning companies.",
  alternates: { canonical: "/solutions" },
};

export default function SolutionsPage() {
  return <main className="min-h-screen bg-slate-50 text-slate-900"><header className="bg-blue-950 px-4 py-20 text-white"><div className="mx-auto max-w-6xl"><Link href="/" className="text-sm font-semibold text-blue-200">← Veltex AI</Link><p className="mt-12 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Cleaning-specific workflows</p><h1 className="mt-4 max-w-4xl text-4xl font-bold sm:text-6xl">Proposal software for the contracts you want to win</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100">Explore how Veltex AI helps cleaning companies turn facility details into clear scopes, pricing, and professional proposals.</p></div></header><section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-2 lg:grid-cols-3">{SOLUTIONS.map((solution) => <article key={solution.slug} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-blue-600">{solution.audience}</p><h2 className="mt-3 text-xl font-bold leading-snug">{solution.title}</h2><p className="mt-3 flex-1 leading-7 text-slate-600">{solution.description}</p><Link href={`/solutions/${solution.slug}`} className="mt-6 inline-flex items-center gap-2 font-semibold text-blue-700">Explore solution <ArrowRight className="h-4 w-4" /></Link></article>)}</section></main>;
}
