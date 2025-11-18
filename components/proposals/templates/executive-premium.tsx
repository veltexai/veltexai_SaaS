'use client';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { TemplateProps } from '@/types/templates';
import VerticalBar from './shared/vertical-bar';
import HorizontalBar from './shared/horizontal-bar';
import Image from 'next/image';
import HeaderLogo from './shared/header-logo';
import HeaderTemplate from './shared/header-template';
import PoweredBy from './shared/powered-by';
import { dmSerifText, montserrat } from '@/lib/fonts';
import { EmailIcon, PhoneIcon, WebTrafficIcon } from '@/components/icons';

export function ExecutivePremiumTemplate({
  proposal,
  branding,
}: TemplateProps) {
  const logoUrl = branding?.logo_url ?? null;
  const phone = branding?.phone ?? null;
  const website = branding?.website ?? null;
  const companyName = branding?.name ?? 'Company';
  const email = branding?.email ?? null;
  const preparedFor =
    proposal.client_company || proposal.client_name || 'Client';

  return (
    <section className="space-y-8">
      <div id="page-one" className="relative aspect-[1/1.4] bg-white">
        <div className="absolute w-[85%] h-[40%] bottom-12 left-1/2 -translate-x-1/2">
          <div className="absolute h-2.5 w-[200px] bg-[var(--color-primary)] -top-[5px]"></div>
          <Image
            src="/images/templates/images/pexels-exnl-931887-1.png"
            alt="Background"
            className="size-full object-cover"
            height={1600}
            width={1100}
          />
          <PoweredBy colorLogo="white" isCenter sizeImage="small" />
        </div>
        {logoUrl ? (
          <HeaderLogo
            logoUrl={logoUrl}
            companyName={companyName}
            isTop
            withoutGradient
            position="start"
          />
        ) : null}
        <div className="absolute top-28 right-10 max-w-[70%]">
          <HeaderTemplate
            title={proposal.title}
            date={proposal.created_at}
            preparedFor={preparedFor}
            address={proposal.service_location}
            textColor="text-[var(--color-primary)]"
            colorBorder="from-[var(--color-primary)] to-[var(--color-primary)]"
            gap="gap-2"
          />
        </div>
      </div>

      <div className="rounded-xl p-8 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white">
        <div className="text-sm uppercase tracking-wide opacity-90">
          Executive Proposal
        </div>
        <h1 className="text-3xl font-extrabold mt-2">{proposal.title}</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center rounded-md bg-white/10 px-3 py-1">
            Client:{' '}
            <span className="ml-1 font-semibold">{proposal.client_name}</span>
          </span>
          <span className="inline-flex items-center rounded-md bg-white/10 px-3 py-1">
            Type:{' '}
            <span className="ml-1 font-semibold capitalize">
              {proposal.service_type}
            </span>
          </span>
          <span className="inline-flex items-center rounded-md bg-white/10 px-3 py-1">
            Frequency:{' '}
            <span className="ml-1 font-semibold capitalize">
              {proposal.service_frequency}
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-4">Executive Summary</h2>
          {proposal.generated_content ? (
            <div className="prose max-w-none">
              <MarkdownRenderer content={proposal.generated_content} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No AI content yet.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border p-6">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Key Details
            </h3>
            <div className="mt-4 space-y-2 text-sm">
              <div>Company: {proposal.client_company || '—'}</div>
              <div>Location: {proposal.service_location}</div>
              <div>Facility: {proposal.facility_size} sq ft</div>
            </div>
          </div>
          <div className="rounded-xl border p-6 bg-muted/40">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Acceptance
            </h3>
            <div className="mt-4 text-sm">
              This proposal remains valid for 30 days from issue. Contact us to
              finalize scope and scheduling.
            </div>
          </div>
        </div>
      </div>

      <div id="page-ten" className="relative aspect-[1/1.4] bg-white">
        <div className="relative w-[85%] h-[55%] top-12 left-1/2 -translate-x-1/2">
          <Image
            src="/images/templates/images/image17.png"
            alt="Background"
            className="size-full object-cover"
            height={1600}
            width={1100}
          />
        </div>
        <div className="absolute w-[90%] bottom-12 left-1/2 -translate-x-1/2 flex items-start justify-center">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={companyName}
              className="h-12 w-auto flex-[80%] object-contain"
              height={48}
              width={144}
            />
          ) : null}
          <div
            className={`flex-auto ${montserrat.className} flex flex-col gap-4`}
          >
            <h1
              className={`text-3xl font-bold text-[var(--color-primary)] ${dmSerifText.className}`}
            >
              Thank you
            </h1>
            <p className="leading-[41px]">
              We appreciate the opportunity to support your facility. Our team
              is committed to reliable service, clear communication, and
              measurable results.
            </p>
            <div className="flex items-center gap-2 font-bold">
              <EmailIcon className="size-6 text-[var(--color-primary)]" />
              <span>Email [{email}]</span>
            </div>
            <div className="flex items-center gap-2 font-bold">
              <PhoneIcon className="size-6 text-[var(--color-primary)]" />
              <span>Phone: [{phone}]</span>
            </div>
            <div className="flex items-center gap-2 font-bold">
              <WebTrafficIcon className="size-6 text-[var(--color-primary)]" />
              <span>Website [{website}]</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
