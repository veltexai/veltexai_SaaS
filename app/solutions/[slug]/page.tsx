import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calculator, Check, ClipboardCheck, FileText } from "lucide-react";
import { getSolution, SOLUTIONS, SOLUTION_SLUGS } from "@/features/solutions/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return SOLUTION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const solution = getSolution((await params).slug);
  if (!solution) return {};
  return {
    title: solution.title,
    description: solution.description,
    alternates: { canonical: `/solutions/${solution.slug}` },
    openGraph: { title: solution.title, description: solution.description, url: `${SITE_URL}/solutions/${solution.slug}` },
  };
}

function CheckList({ items }: { items: string[] }) {
  return <ul className="mt-6 grid gap-3">{items.map((item) => <li key={item} className="flex gap-3 leading-7 text-slate-700"><Check className="mt-1 h-5 w-5 shrink-0 text-emerald-600" /><span>{item}</span></li>)}</ul>;
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const solution = getSolution((await params).slug);
  if (!solution) notFound();

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/solutions/${solution.slug}`,
    description: solution.description,
    offers: { "@type": "Offer", url: `${SITE_URL}/pricing` },
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: solution.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <header className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 px-4 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <Link href="/solutions" className="text-sm font-semibold text-blue-200 hover:text-white">← All solutions</Link>
          <p className="mt-12 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">{solution.audience}</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold leading-tight sm:text-6xl">{solution.title}</h1>
          <p className="mt-6 max-w-3xl text-xl leading-8 text-blue-100">{solution.description}</p>
          <p className="mt-5 inline-flex rounded-full border border-blue-400/50 bg-blue-950/40 px-4 py-2 text-sm font-semibold text-blue-100">Primary intent: {solution.intentLabel}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={solution.primaryCta.href} className="rounded-lg bg-white px-6 py-3 font-bold text-blue-900 hover:bg-blue-50">{solution.primaryCta.label}</Link>
            <Link href={solution.secondaryCta.href} className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-6 py-3 font-bold text-white hover:bg-white">{solution.secondaryCta.label}<ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">The operating context</p>
          <h2 className="mt-3 text-3xl font-bold">{solution.painTitle}</h2>
          <p className="mt-5 text-lg leading-8 text-slate-700">{solution.summary}</p>
          <p className="mt-5 leading-7 text-slate-600">{solution.painIntro}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7">
          <h3 className="text-xl font-bold">Problems to resolve before sending</h3>
          <CheckList items={solution.challenges} />
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">Workflow</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{solution.workflowTitle}</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">{solution.workflowIntro}</p>
          </div>
          <ol className="mt-10 grid gap-5 lg:grid-cols-5">
            {solution.workflow.map((step, index) => <li key={step.title} className="rounded-xl border border-slate-700 bg-slate-900 p-5"><NumberText index={index + 1} /><h3 className="mt-4 font-bold text-white">{step.title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{step.body}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-800"><ClipboardCheck className="h-6 w-6" /></div>
          <h2 className="mt-5 text-3xl font-bold">{solution.checklistTitle}</h2>
          <p className="mt-4 leading-7 text-slate-600">{solution.checklistIntro}</p>
          <CheckList items={solution.checklist} />
        </div>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-7 sm:p-9">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-200 text-amber-900"><Calculator className="h-6 w-6" /></div>
          <h2 className="mt-5 text-2xl font-bold">{solution.example.title}</h2>
          <p className="mt-4 leading-7 text-slate-700">{solution.example.intro}</p>
          <h3 className="mt-7 font-bold">Assumptions</h3><CheckList items={solution.example.assumptions} />
          <h3 className="mt-7 font-bold">How to structure it</h3>
          <ol className="mt-4 space-y-3">{solution.example.steps.map((step, index) => <li key={step} className="flex gap-3 leading-7 text-slate-700"><span className="font-bold text-amber-800">{index + 1}.</span><span>{step}</span></li>)}</ol>
          <p className="mt-7 border-t border-amber-200 pt-6 text-sm leading-6 text-slate-700"><strong>Takeaway:</strong> {solution.example.takeaway}</p>
        </article>
      </section>

      <section className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl"><FileText className="h-8 w-8 text-blue-700" /><h2 className="mt-4 text-3xl font-bold">{solution.proposalTitle}</h2><p className="mt-4 text-lg leading-8 text-slate-700">{solution.proposalIntro}</p></div>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            <BoundaryCard title="Include and define" items={solution.inclusions} tone="emerald" />
            <BoundaryCard title="Exclude or qualify" items={solution.exclusions} tone="rose" />
            <BoundaryCard title="Offer separately" items={solution.options} tone="blue" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Questions cleaning contractors ask</h2>
        <div className="mt-9 space-y-4">{solution.faq.map((item) => <details key={item.question} className="group rounded-xl border border-slate-200 bg-white p-6"><summary className="cursor-pointer list-none font-bold text-slate-900">{item.question}</summary><p className="mt-4 leading-7 text-slate-600">{item.answer}</p></details>)}</div>
      </section>

      <section className="bg-blue-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center"><h2 className="text-3xl font-bold">{solution.ctaTitle}</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">{solution.ctaBody}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href={solution.primaryCta.href} className="rounded-lg bg-emerald-400 px-6 py-3 font-bold text-emerald-950 hover:bg-emerald-300">{solution.primaryCta.label}</Link><Link href={solution.secondaryCta.href} className="rounded-lg border border-blue-300 px-6 py-3 font-bold hover:bg-blue-900">{solution.secondaryCta.label}</Link></div></div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14"><h2 className="text-2xl font-bold">Continue exploring cleaning proposal workflows</h2><div className="mt-6 grid gap-4 md:grid-cols-3">{SOLUTIONS.filter((item) => item.slug !== solution.slug).slice(0, 3).map((item) => <Link key={item.slug} href={`/solutions/${item.slug}`} className="rounded-xl border border-slate-200 p-5 hover:border-blue-300"><span className="text-xs font-bold uppercase tracking-wider text-blue-700">{item.intentLabel}</span><span className="mt-2 block font-bold text-slate-900">{item.title}</span></Link>)}</div></section>
    </main>
  );
}

function NumberText({ index }: { index: number }) {
  return <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 font-bold text-emerald-950">{index}</span>;
}

function BoundaryCard({ title, items, tone }: { title: string; items: string[]; tone: "emerald" | "rose" | "blue" }) {
  const colors = { emerald: "border-emerald-200 bg-emerald-50", rose: "border-rose-200 bg-rose-50", blue: "border-blue-200 bg-blue-50" };
  return <div className={`rounded-2xl border p-6 ${colors[tone]}`}><h3 className="text-lg font-bold">{title}</h3><CheckList items={items} /></div>;
}
