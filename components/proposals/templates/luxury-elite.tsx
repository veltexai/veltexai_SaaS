'use client';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { TemplateProps } from '@/types/templates';
import Image from 'next/image';
import PoweredBy from './shared/powered-by';
import HeaderLogo from './shared/header-logo';
import HeaderTemplate from './shared/header-template';
import ProposalTableOfContents from './shared/proposal-table-of-contents';
import { formatDateLong } from '@/lib/utils';
import { montserrat } from '@/lib/fonts';
import CTAPage from './shared/CTA-page';
import NavitationNumber from './shared/navigation';
import SignatureSection from './shared/signature-section';
import ProposalTitle from './shared/proposal-title';
import SignatureContent from './shared/signature-content';

export function LuxuryEliteTemplate({ proposal, branding }: TemplateProps) {
  const logoUrl = branding?.logo_url ?? null;
  const phone = branding?.phone ?? null;
  const website = branding?.website ?? null;
  const companyName = branding?.name ?? 'Company';
  const email = branding?.email ?? null;
  const preparedFor =
    proposal.client_company || proposal.client_name || 'Client';
  return (
    <section className="space-y-6">
      <div
        id="page-one"
        className="relative aspect-[1/1.4] bg-white overflow-hidden"
      >
        <p
          className={`absolute -right-[48px] top-[88.5px] -rotate-90 z-30 text-white text-sm ${montserrat.className}`}
        >
          {formatDateLong(proposal.created_at)}
        </p>
        {logoUrl ? (
          <HeaderLogo
            logoUrl={logoUrl}
            companyName={companyName}
            isTop
            withoutGradient
            position="center"
            template="luxury_elite"
          />
        ) : null}
        <Image
          src="/images/templates/bgLuxi.png"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
          height={1600}
          width={1100}
        />

        <div className="absolute top-50 left-20 max-w-[75%]">
          <HeaderTemplate
            title={proposal.title}
            date={proposal.created_at}
            preparedFor={preparedFor}
            address={proposal.service_location}
            textColor="text-white"
            colorBorder="bg-white"
            gap="gap-0"
            template="luxury_elite"
          />
        </div>
        <Image
          src="/images/templates/Images/Maskgroup.png"
          alt="Logo"
          className="absolute bottom-0 -left-8 object-contain opacity-70"
          height={1000}
          width={600}
        />
        <PoweredBy
          colorLogo="gray"
          isRight
          sizeImage="small"
          template="luxury_elite"
        />
      </div>

      <ProposalTableOfContents templateType="luxury_elite" />

      <div
        id="page-nine"
        className="relative aspect-[1/1.4] bg-white pl-16 pt-[38px] overflow-hidden"
      >
        <ProposalTitle
          templateType="luxury_elite"
          title="Proposal Acceptance"
        />
        <SignatureContent templateType="luxury_elite" />
        <SignatureSection templateType="luxury_elite" />
        <PoweredBy colorLogo="gray" isRight sizeImage="small" />
        <NavitationNumber
          value={9}
          size="sm"
          fontFamily="bely"
          font="bold"
          position="top-right-corner"
        />
      </div>

      <div id="page-ten" className="relative aspect-[1/1.4] bg-white">
        <CTAPage
          email={email}
          phone={phone}
          website={website}
          logoUrl={logoUrl}
          companyName={companyName}
          templateType="luxury_elite"
        />
      </div>
    </section>
  );
}
