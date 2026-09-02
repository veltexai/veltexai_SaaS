import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getResource, RESOURCES, RESOURCE_SLUGS } from "@/features/resources/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function generateStaticParams() { return RESOURCE_SLUGS.map((slug) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resource = getResource(slug);
  if (!resource) return {};
  return { title: resource.title, description: resource.description, alternates: { canonical: `/resources/${slug}` }, openGraph: { type: "article", title: resource.title, description: resource.description, url: `${SITE_URL}/resources/${slug}` } };
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = getResource(slug);
  if (!resource) notFound();
  const related = RESOURCES.filter((item) => item.slug !== slug).slice(0, 3);
  const schema = { "@context": "https://schema.org", "@type": "Article", headline: resource.title, description: resource.description, author: { "@type": "Organization", name: SITE_NAME }, publisher: { "@type": "Organization", name: SITE_NAME }, mainEntityOfPage: `${SITE_URL}/resources/${slug}` };
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="border-b border-slate-200 bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-3xl"><Link href="/resources" className="text-sm font-semibold text-blue-700">← All resources</Link><p className="mt-10 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">{resource.eyebrow} · {resource.readTime}</p><h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">{resource.title}</h1><p className="mt-6 text-xl leading-8 text-slate-600">{resource.description}</p></div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-14">
        {resource.sections.map((section) => <section key={section.heading} className="mb-11"><h2 className="text-2xl font-bold">{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-lg leading-8 text-slate-700">{paragraph}</p>)}{section.bullets && <ul className="mt-5 space-y-3 pl-6 text-lg leading-8 text-slate-700">{section.bullets.map((bullet) => <li key={bullet} className="list-disc pl-1">{bullet}</li>)}</ul>}</section>)}
        <aside className="mt-14 rounded-2xl bg-blue-700 p-8 text-white"><h2 className="text-2xl font-bold">Turn the walkthrough into a proposal</h2><p className="mt-3 leading-7 text-blue-100">Build a cleaning-specific scope, price, and polished proposal in minutes. Try the demo before creating an account.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/demo-proposal" className="rounded-lg bg-white px-5 py-3 font-bold text-blue-700">Try the free demo</Link><Link href="/auth/signup?from=resources" className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-5 py-3 font-bold">Start free trial <ArrowRight className="h-4 w-4" /></Link></div></aside>
        <div className="mt-14 border-t border-slate-200 pt-10"><h2 className="text-xl font-bold">Continue learning</h2><ul className="mt-4 space-y-3">{related.map((item) => <li key={item.slug}><Link href={`/resources/${item.slug}`} className="font-semibold text-blue-700 hover:underline">{item.title}</Link></li>)}</ul></div>
      </article>
    </main>
  );
}
