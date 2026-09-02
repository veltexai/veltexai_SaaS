import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { getSolution, SOLUTIONS, SOLUTION_SLUGS } from "@/features/solutions/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function generateStaticParams() { return SOLUTION_SLUGS.map((slug) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const solution = getSolution((await params).slug);
  if (!solution) return {};
  return { title: solution.title, description: solution.description, alternates: { canonical: `/solutions/${solution.slug}` }, openGraph: { title: solution.title, description: solution.description, url: `${SITE_URL}/solutions/${solution.slug}` } };
}

function List({ items }: { items: string[] }) { return <ul className="mt-5 space-y-3">{items.map((item) => <li key={item} className="flex gap-3 leading-7 text-slate-700"><Check className="mt-1 h-5 w-5 shrink-0 text-emerald-600" /><span>{item}</span></li>)}</ul>; }

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const solution = getSolution((await params).slug);
  if (!solution) notFound();
  const schema = { "@context": "https://schema.org", "@type": "Service", name: solution.title, description: solution.description, provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL }, areaServed: "United States" };
  return <main className="min-h-screen bg-white text-slate-900"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><header className="bg-gradient-to-br from-blue-950 to-blue-700 px-4 py-20 text-white"><div className="mx-auto max-w-5xl"><Link href="/solutions" className="text-sm font-semibold text-blue-200">← All solutions</Link><p className="mt-12 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">{solution.audience}</p><h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">{solution.title}</h1><p className="mt-6 max-w-3xl text-xl leading-8 text-blue-100">{solution.description}</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/demo-proposal" className="rounded-lg bg-white px-6 py-3 font-bold text-blue-800">Try a demo proposal</Link><Link href="/auth/signup?from=solutions" className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-6 py-3 font-bold">Start free trial <ArrowRight className="h-4 w-4" /></Link></div></div></header><section className="mx-auto grid max-w-5xl gap-10 px-4 py-16 md:grid-cols-3"><div><h2 className="text-2xl font-bold">Common bidding challenges</h2><List items={solution.challenges} /></div><div><h2 className="text-2xl font-bold">Build a clearer scope</h2><List items={solution.scope} /></div><div><h2 className="text-2xl font-bold">A more repeatable process</h2><List items={solution.outcomes} /></div></section><section className="bg-slate-50 px-4 py-16"><div className="mx-auto max-w-3xl"><h2 className="text-3xl font-bold">From walkthrough details to a proposal</h2><p className="mt-5 text-lg leading-8 text-slate-700">Veltex AI helps you organize facility information, draft a cleaning-specific scope, build pricing, and present the result in a branded proposal. You remain in control of the assumptions, edits, price, and final customer commitment.</p><div className="mt-8 flex flex-wrap gap-5"><Link href="/tools/cleaning-bid-calculator" className="font-semibold text-blue-700 hover:underline">Use the free bid calculator →</Link><Link href="/resources/how-to-write-commercial-cleaning-proposal" className="font-semibold text-blue-700 hover:underline">Read the proposal guide →</Link></div></div></section><section className="mx-auto max-w-5xl px-4 py-14"><h2 className="text-2xl font-bold">Other cleaning proposal solutions</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{SOLUTIONS.filter((item) => item.slug !== solution.slug).slice(0, 3).map((item) => <Link key={item.slug} href={`/solutions/${item.slug}`} className="rounded-xl border border-slate-200 p-5 font-semibold text-blue-700 hover:border-blue-300">{item.audience} →</Link>)}</div></section></main>;
}
