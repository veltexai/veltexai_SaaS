'use client';

import type { TemplateProps } from '@/features/templates/types/templates';
import ProposalTableOfContents from './sections/table-of-contents';
import Image from 'next/image';
import PoweredBy from './shared/powered-by';
import HeaderLogo from './shared/header-logo';
import HeaderTemplate from './shared/header-template';
import VerticalBar from './shared/vertical-bar';
import HorizontalBar from './shared/horizontal-bar';
import ThankYouPage from './shared/thank-you';
import ProposalTitle from './shared/proposal-title';
import SignatureContent from './shared/signature-content';
import SignatureSection from './shared/signature-section';
import NavitationNumber from './shared/navigation';
import TitleDescriptionSection from './shared/title-description-section';
import ContentQualificationsSection from './shared/content-qualifications-section';
import { useSplitContent } from '../hooks/use-split-content';
import { montserrat } from '@/lib/fonts';
import {
  AboutOurCompany,
  Addons,
  Notes,
  OurCommitement,
  ScopeOfService,
  ServiceQuotePricing,
  WhyChooseUs,
} from './sections';

export function ModernCorporateTemplate({
  proposal,
  branding,
  pages,
  print,
}: TemplateProps) {
  const logoUrl = branding?.logo_url ?? null;
  const phone = branding?.phone ?? null;
  const website = branding?.website ?? null;
  const companyName = branding?.name ?? 'Company';
  const email = branding?.email ?? null;
  const preparedFor =
    proposal.client_company || proposal.client_name || 'Client';

  const { about, commitment, whyUs, scope, addons, pricing, notes } =
    print && pages
      ? {
          about: { content: pages[0] },
          commitment: { content: pages[1] },
          whyUs: { content: pages[2] },
          scope: { content: pages[3] },
          addons: { content: pages[4] },
          pricing: { content: pages[5] },
          notes: { content: pages[6] },
        }
      : useSplitContent(proposal.id);

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
            priority
            unoptimized
          />
          <PoweredBy
            colorLogo="white"
            isCenter
            template="modern_corporate"
            className="w-[90%]"
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
            src="/images/templates/Images/pexels-exnl-9318871-1.png"
            alt="Background"
            className="size-full object-cover"
            height={1600}
            width={1100}
            priority
            unoptimized
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

      {about || commitment || whyUs || scope || addons || pricing || notes
        ? (() => {
            return (
              <>
                <div
                  id="page-three"
                  className="relative aspect-[1/1.4] bg-white pt-16 pl-30"
                >
                  <div>
                    {about?.content ? (
                      <AboutOurCompany
                        title={about.title ?? 'About Our Company'}
                        content={about.content}
                        templateType="modern_corporate"
                        className={`${montserrat.className}`}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No content
                      </div>
                    )}
                  </div>
                  <Image
                    src={`/images/templates/Images/image 12-1.png`}
                    alt="qualifications"
                    width={800}
                    height={500}
                    className="z-30 absolute bottom-20 left-20 max-w-[85%]"
                    priority
                    unoptimized
                  />
                  <VerticalBar className="left-20" variant="gradientGray" />
                  <HorizontalBar className="bottom-20" variant="gradientGray" />
                  <PoweredBy colorLogo="gray" isRight />
                  <NavitationNumber
                    value={3}
                    size="lg"
                    fontFamily="dmSerifText"
                    font="bold"
                    position="bottom-left-corner"
                  />
                </div>

                <div
                  id="page-four"
                  className="relative aspect-[1/1.4] bg-white pt-16 pl-30"
                >
                  <div className="max-w-[95%]">
                    <div>
                      {commitment?.content ? (
                        <OurCommitement
                          title={commitment.title ?? 'Our Commitment'}
                          content={commitment.content}
                          templateType="modern_corporate"
                          className={`${montserrat.className}`}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No content
                        </div>
                      )}
                    </div>
                    <div className="mt-10">
                      {whyUs?.content ? (
                        <WhyChooseUs
                          title={whyUs.title ?? 'Why Choose Us'}
                          content={whyUs.content}
                          templateType="modern_corporate"
                          className={`${montserrat.className}`}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No content
                        </div>
                      )}
                    </div>
                  </div>
                  <VerticalBar className="left-20" variant="gradientGray" />
                  <HorizontalBar className="bottom-20" variant="gradientGray" />
                  <PoweredBy colorLogo="gray" isRight />
                  <NavitationNumber
                    value={4}
                    size="lg"
                    fontFamily="dmSerifText"
                    font="bold"
                    position="bottom-left-corner"
                  />
                </div>

                {/* Page five */}
                <div
                  id="page-five"
                  className="relative aspect-[1/1.4] bg-white pt-16 pl-30"
                >
                  <VerticalBar className="left-20" variant="gradientGray" />
                  <HorizontalBar className="bottom-20" variant="gradientGray" />
                  <ProposalTitle
                    templateType="modern_corporate"
                    title="Our Qualifications"
                  />
                  <ContentQualificationsSection templateType="modern_corporate" />

                  <PoweredBy colorLogo="gray" isRight />
                  <NavitationNumber
                    value={8}
                    size="lg"
                    fontFamily="dmSerifText"
                    font="bold"
                    position="bottom-left-corner"
                  />
                </div>

                <div
                  id="page-six"
                  className="relative aspect-[1/1.4] bg-white pt-16 pl-30"
                >
                  <div className="max-w-[95%]">
                    {scope?.content ? (
                      <ScopeOfService
                        title={scope.title ?? 'Scope of Service'}
                        content={scope.content}
                        templateType="modern_corporate"
                        className={`${montserrat.className}`}
                        description={scope.description || ''}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No content
                      </div>
                    )}
                  </div>
                  <div className="max-w-[95%]">
                    {addons?.content ? (
                      <Addons
                        title={addons.title ?? 'Add-ons'}
                        content={addons.content}
                        templateType="modern_corporate"
                        className={`${montserrat.className}`}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No content
                      </div>
                    )}
                  </div>
                  <VerticalBar className="left-20" variant="gradientGray" />
                  <HorizontalBar className="bottom-20" variant="gradientGray" />
                  <PoweredBy colorLogo="gray" isRight />
                  <NavitationNumber
                    value={6}
                    size="lg"
                    fontFamily="dmSerifText"
                    font="bold"
                    position="bottom-left-corner"
                  />
                </div>

                <div
                  id="page-seven"
                  className="relative aspect-[1/1.4] bg-white pt-16 pl-30"
                >
                  <div className="max-w-[95%] space-y-8">
                    {pricing?.content ? (
                      <ServiceQuotePricing
                        title={pricing.title ?? 'Service Quote & Pricing'}
                        content={pricing.content}
                        description={pricing.description}
                        templateType="modern_corporate"
                        className={`${montserrat.className}`}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No content
                      </div>
                    )}
                    {notes?.content ? (
                      <Notes
                        title={notes.title ?? 'Notes'}
                        content={notes.content}
                        templateType="modern_corporate"
                        className={`${montserrat.className}`}
                      />
                    ) : null}
                  </div>
                  <VerticalBar className="left-20" variant="gradientGray" />
                  <HorizontalBar className="bottom-20" variant="gradientGray" />
                  <PoweredBy colorLogo="gray" isRight />
                  <NavitationNumber
                    value={7}
                    size="lg"
                    fontFamily="dmSerifText"
                    font="bold"
                    position="bottom-left-corner"
                  />
                </div>
              </>
            );
          })()
        : null}

      <div
        id="page-eight"
        className="relative aspect-[1/1.4] bg-white pt-16 pl-30"
      >
        <VerticalBar className="left-20" variant="gradientGray" />
        <HorizontalBar className="bottom-20" variant="gradientGray" />
        <ProposalTitle templateType="modern_corporate" title="Terms & Legal" />

        <TitleDescriptionSection templateType="modern_corporate" />
        <PoweredBy colorLogo="gray" isRight />
        <NavitationNumber
          value={8}
          size="lg"
          fontFamily="dmSerifText"
          font="bold"
          position="bottom-left-corner"
        />
      </div>

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
        <PoweredBy colorLogo="gray" isRight />
        <NavitationNumber
          value={9}
          size="lg"
          fontFamily="dmSerifText"
          font="bold"
          position="bottom-left-corner"
        />
      </div>

      <div id="page-ten" className="relative aspect-[1/1.4] bg-white">
        <ThankYouPage
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
