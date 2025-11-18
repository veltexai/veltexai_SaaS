'use client';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { TemplateProps } from '@/types/templates';
import ProposalTableOfContents from './shared/proposal-table-of-contents';
import Image from 'next/image';
import PoweredBy from './shared/powered-by';
import HeaderLogo from './shared/header-logo';
import HeaderTemplate from './shared/header-template';
import VerticalBar from './shared/vertical-bar';
import HorizontalBar from './shared/horizontal-bar';
import CTAPage from './shared/CTA-page';
import ProposalTitle from './shared/proposal-title';
import SignatureContent from './shared/signature-content';
import SignatureSection from './shared/signature-section';
import NavitationNumber from './shared/navigation';

export function ModernCorporateTemplate({ proposal, branding }: TemplateProps) {
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
        <HorizontalBar className="bottom-[58px] !h-[1px]" />
        <HorizontalBar className="bottom-32 !h-[1px]" />
        <div className="relative z-10 w-40 h-[calc(100%-170px)] left-15 -bottom-[112px]">
          <VerticalBar
            className="-right-[1px] top-[260px] !w-[1px]"
            variant="white"
          />
          <VerticalBar
            className="-left-[1px] top-[260px] !w-[1px]"
            variant="white"
          />
          <Image
            src="/images/templates/Rectangle.svg"
            alt="Rectangle"
            className="size-full object-cover"
            height={1600}
            width={1100}
          />
          <PoweredBy
            colorLogo="white"
            isCenter
            sizeImage="small"
            template="modern_corporate"
          />

          <VerticalBar
            className="-right-[1px] bottom-[260px] !w-[1px]"
            variant="normal"
          />
          <VerticalBar
            className="-left-[1px] bottom-[260px] !w-[1px]"
            variant="normal"
          />
        </div>
        <div className="absolute w-[90%] h-[40%] bottom-8 left-1/2 -translate-x-1/2">
          <Image
            src="/images/templates/images/pexels-exnl-9318871-1.png"
            alt="Background"
            className="size-full object-cover"
            height={1600}
            width={1100}
          />
        </div>
        {logoUrl ? (
          <HeaderLogo
            logoUrl={logoUrl}
            companyName={companyName}
            isTop
            withoutGradient
            position="center"
          />
        ) : null}
        <div className="absolute top-28 right-10 max-w-[64%]">
          <HeaderTemplate
            title={proposal.title}
            date={proposal.created_at}
            preparedFor={preparedFor}
            address={proposal.service_location}
            textColor="text-[#383838]"
            colorBorder="bg-[#383838]"
            gap="gap-2"
            template="modern_corporate"
          />
        </div>
      </div>

      <ProposalTableOfContents templateType="modern_corporate" />

      <div
        id="page-nine"
        className="relative aspect-[1/1.4] bg-white pt-16 pl-30"
      >
        <VerticalBar className="left-20" variant="normal" />
        <HorizontalBar className="bottom-20" variant="normal" />
        <ProposalTitle
          templateType="modern_corporate"
          title="Proposal Acceptance"
        />
        <SignatureContent templateType="modern_corporate" />
        <SignatureSection templateType="modern_corporate" />
        <PoweredBy colorLogo="gray" isRight sizeImage="small" />
        <NavitationNumber
          value={9}
          size="lg"
          fontFamily="dmSerifText"
          font="bold"
          position="bottom-left-corner"
        />
      </div>

      <div id="page-ten" className="relative aspect-[1/1.4] bg-white">
        <CTAPage
          email={email}
          phone={phone}
          website={website}
          logoUrl={logoUrl}
          companyName={companyName}
          templateType="modern_corporate"
        />
      </div>
    </section>
  );
}
