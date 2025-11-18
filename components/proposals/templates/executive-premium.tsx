'use client';

import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { TemplateProps } from '@/types/templates';
import Image from 'next/image';
import HeaderLogo from './shared/header-logo';
import HeaderTemplate from './shared/header-template';
import PoweredBy from './shared/powered-by';
import { dmSerifText, montserrat } from '@/lib/fonts';
import { EmailIcon, PhoneIcon, WebTrafficIcon } from '@/components/icons';
import ProposalTableOfContents from './shared/proposal-table-of-contents';
import CTAPage from './shared/CTA-page';
import ProposalTitle from './shared/proposal-title';
import VerticalBar from './shared/vertical-bar';
import HorizontalBar from './shared/horizontal-bar';
import SignatureSection from './shared/signature-section';
import SignatureContent from './shared/signature-content';
import NavitationNumber from './shared/navigation';

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

      <ProposalTableOfContents templateType="executive_premium" />

      <div
        id="page-nine"
        className="relative aspect-[1/1.4] bg-white pt-16 pl-30"
      >
        <VerticalBar className="left-20" variant="gradientGray" />
        <HorizontalBar className="bottom-20" variant="gradientGray" />
        <ProposalTitle
          templateType="executive_premium"
          title="Proposal Acceptance"
        />
        <SignatureContent templateType="executive_premium" />

        <SignatureSection templateType="executive_premium" />
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
          templateType="executive_premium"
        />
      </div>
    </section>
  );
}
