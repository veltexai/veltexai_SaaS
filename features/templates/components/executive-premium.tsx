'use client';

import type {
  TemplateProps,
  TemplateType,
} from '@/features/templates/types/templates';
import Image from 'next/image';
import HeaderLogo from './shared/header-logo';
import HeaderTemplate from './shared/header-template';
import PoweredBy from './shared/powered-by';
import { dmSerifText, montserrat } from '@/lib/fonts';
import ProposalTableOfContents from './sections/table-of-contents';
import ThankYouPage from './shared/thank-you';
import ProposalTitle from './shared/proposal-title';
import VerticalBar from './shared/vertical-bar';
import HorizontalBar from './shared/horizontal-bar';
import SignatureSection from './shared/signature-section';
import SignatureContent from './shared/signature-content';
import NavitationNumber from './shared/navigation';
import TitleDescriptionSection from './shared/title-description-section';
import ContentQualificationsSection from './shared/content-qualifications-section';
import { useSplitContent } from '../hooks/use-split-content';
import {
  AboutOurCompany,
  Addons,
  Notes,
  OurCommitement,
  ScopeOfService,
  ServiceQuotePricing,
  WhyChooseUs,
} from './sections';

export function ExecutivePremiumTemplate({
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

  const {
    about,
    commitment,
    whyUs,
    scope,
    addons,
    pricing,
    notes,
    loading,
    error,
  } =
    print && pages
      ? {
          about: { content: pages[0] },
          commitment: { content: pages[1] },
          whyUs: { content: pages[2] },
          scope: { content: pages[3] },
          addons: { content: pages[4] },
          pricing: { content: pages[5] },
          notes: { content: pages[6] },
          loading: false,
          error: null,
        }
      : useSplitContent(proposal.id);

  return (
    <section className="space-y-8">
      {/* Page One */}
      <div id="page-one" className="relative aspect-[1/1.4] bg-white">
        <div className="absolute w-[85%] h-[40%] sm:bottom-12 bottom-6 left-1/2 -translate-x-1/2">
          <div className="absolute h-2.5 w-[200px] bg-[var(--color-primary)] -top-[5px]"></div>
          <Image
            src="/images/templates/Images/pexels-exnl-931887-1.png"
            alt="Background"
            className="size-full object-cover"
            height={1600}
            width={1100}
          />
          <PoweredBy colorLogo="white" isCenter />
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
        <div className="absolute top-12 sm:top-28 right-10 max-w-[70%]">
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
      {/* Page Two */}
      <ProposalTableOfContents templateType="executive_premium" />
      {/* Content Pages: AI-split */}
      {loading && (
        <div className="relative aspect-[1/1.4] bg-white p-8">
          <div className="text-sm text-muted-foreground">Loading content…</div>
        </div>
      )}
      {error && (
        <div className="relative aspect-[1/1.4] bg-white p-8">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}
      {about || commitment || whyUs || scope || addons || pricing || notes
        ? (() => {
            return (
              <>
                <div
                  id="page-three"
                  className="relative aspect-[1/1.4] bg-white p-4 sm:p-8"
                >
                  <div className="max-w-none pl-10 sm:pl-[95px]">
                    {about?.content ? (
                      <AboutOurCompany
                        title={about.title ?? 'About Our Company'}
                        content={about.content}
                        templateType="executive_premium"
                        className={`${montserrat.className}`}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No content
                      </div>
                    )}
                  </div>
                  <Image
                    src={`/images/templates/Images/image 12.png`}
                    alt="qualifications"
                    width={800}
                    height={500}
                    className="z-30 absolute sm:bottom-20 bottom-6 left-6 sm:left-20 max-w-[85%]"
                  />
                  <VerticalBar  variant="gradientGray" />
                  <HorizontalBar  variant="gradientGray" />
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
                  className="relative aspect-[1/1.4] bg-white p-6 sm:p-8"
                >
                  <div className="gap-6 pl-10 sm:pl-[95px]">
                    <div>
                      {commitment?.content ? (
                        <OurCommitement
                          title={commitment.title ?? 'Our Commitment'}
                          content={commitment.content}
                          templateType="executive_premium"
                          className={`${montserrat.className}`}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No content
                        </div>
                      )}
                    </div>
                    <div className="mt-6 sm:mt-10">
                      {whyUs?.content ? (
                        <WhyChooseUs
                          title={whyUs.title ?? 'Why Choose Us'}
                          content={whyUs.content}
                          templateType="executive_premium"
                          className={`${montserrat.className}`}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No content
                        </div>
                      )}
                    </div>
                  </div>
                  <VerticalBar  variant="gradientGray" />
                  <HorizontalBar  variant="gradientGray" />
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
                  className="relative sm:aspect-[1/1.4] aspect-[1/1.62] bg-white sm:pt-16 pt-6 pl-10 sm:pl-30"
                >
                  <VerticalBar  variant="gradientGray" />
                  <HorizontalBar  variant="gradientGray" />
                  
                  <div className="pl-6 sm:pl-0">
                  <ProposalTitle
                    templateType="executive_premium"
                    title="Our Qualifications"
                  />
                    </div>
                  <ContentQualificationsSection templateType="executive_premium" />

                  <PoweredBy colorLogo="gray" isRight />
                  <NavitationNumber
                    value={5}
                    size="lg"
                    fontFamily="dmSerifText"
                    font="bold"
                    position="bottom-left-corner"
                  />
                </div>

                <div
                  id="page-six"
                  className="relative aspect-[1/1.4] bg-white sm:p-8 p-6 sm:pb-0 pb-10"
                >
                  <div className="gap-6 pl-10 sm:pl-[95px]">
                    <div>
                      {scope?.content ? (
                        <ScopeOfService
                          title={scope.title ?? 'Scope of Service'}
                          content={scope.content}
                          templateType="executive_premium"
                          className={`${montserrat.className}`}
                          description={scope.description || ''}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No content
                        </div>
                      )}
                    </div>
                    <div>
                      {addons?.content ? (
                        <Addons
                          title={addons.title ?? 'Add-ons'}
                          content={addons.content}
                          templateType="executive_premium"
                          className={`${montserrat.className}`}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No content
                        </div>
                      )}
                    </div>
                  </div>
                  <VerticalBar  variant="gradientGray" />
                  <HorizontalBar  variant="gradientGray" />
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
                  className="relative aspect-[1/1.4] bg-white sm:p-8 p-6 sm:pb-0 pb-10"
                >
                  <div className="max-w-none sm:pl-[95px] pl-10 space-y-8">
                    {pricing?.content ? (
                      <ServiceQuotePricing
                        title={pricing.title ?? 'Service Quote & Pricing'}
                        content={pricing.content}
                        description={pricing.description}
                        templateType="executive_premium"
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
                        templateType="executive_premium"
                        className={`${montserrat.className}`}
                      />
                    ) : null}
                  </div>
                  <VerticalBar  variant="gradientGray" />
                  <HorizontalBar  variant="gradientGray" />
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

      {/* Page Eight */}
      <div
        id="page-eight"
        className="relative aspect-[1/1.4] bg-white sm:pt-16 pt-6 sm:pl-30 pl-10 sm:pb-0 pb-10"
      >
        <VerticalBar  variant="gradientGray" />
        <HorizontalBar  variant="gradientGray" />
        
        <div className="pl-6 sm:pl-0">
        <ProposalTitle templateType="executive_premium" title="Terms & Legal" />
        </div>

        <TitleDescriptionSection templateType="executive_premium" />
        <PoweredBy colorLogo="gray" isRight />
        <NavitationNumber
          value={8}
          size="lg"
          fontFamily="dmSerifText"
          font="bold"
          position="bottom-left-corner"
        />
      </div>

      {/* Page Nine */}
      <div
        id="page-nine"
        className="relative aspect-[1/1.4] bg-white sm:pt-16 pt-6 sm:pl-30 pl-10 sm:pb-0 pb-10"
      >
        <VerticalBar  variant="gradientGray" />
        <HorizontalBar  variant="gradientGray" />

        <div className="pl-6 sm:pl-0">
        <ProposalTitle
          templateType="executive_premium"
          title="Proposal Acceptance"
        />
        </div>
      
        <SignatureContent templateType="executive_premium" />

        <SignatureSection templateType="executive_premium" />
        <PoweredBy colorLogo="gray" isRight />
        <NavitationNumber
          value={9}
          size="lg"
          fontFamily="dmSerifText"
          font="bold"
          position="bottom-left-corner"
        />
      </div>

      {/* Page Ten */}
      <div id="page-ten" className="relative aspect-[1/1.4] bg-white">
        <ThankYouPage
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
