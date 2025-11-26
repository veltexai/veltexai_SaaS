'use client';

import type { TemplateProps } from '@/features/templates/types/templates';
import Image from 'next/image';
import { formatDateLong } from '@/lib/utils';
import { arvo, montserrat } from '@/lib/fonts';
import {
  PoweredBy,
  HeaderLogo,
  HeaderTemplate,
  ThankYouPage,
  NavitationNumber,
  SignatureSection,
  ProposalTitle,
  SignatureContent,
  TitleDescriptionSection,
  ContentQualificationsSection,
} from './shared';
import {
  AboutOurCompany,
  Addons,
  Notes,
  OurCommitement,
  ScopeOfService,
  ServiceQuotePricing,
  WhyChooseUs,
  TableOfContents,
} from './sections';
import { LuxuryEliteBackgroundTitle } from '@/components/icons';
import { useSplitContent } from '../hooks/use-split-content';

export function LuxuryEliteTemplate({
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
        <PoweredBy colorLogo="gray" isRight template="luxury_elite" />
      </div>

      <TableOfContents templateType="luxury_elite" />

      {about || commitment || whyUs || scope || addons || pricing || notes
        ? (() => {
            return (
              <>
                <div
                  id="page-three"
                  className="relative aspect-[1/1.4] bg-white overflow-hidden pl-16 !pt-[38px]"
                >
                  <div className="max-w-[80%] absolute bottom-5 right-15">
                    {about?.content ? (
                      <AboutOurCompany
                        title={about.title ?? 'About Our Company'}
                        content={about.content}
                        templateType="luxury_elite"
                        className={`${arvo.className}`}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No content
                      </div>
                    )}
                  </div>
                  <Image
                    src={`/images/templates/Images/Mask group-2.png`}
                    alt="qualifications"
                    width={800}
                    height={500}
                    className="z-30 absolute top-0 left-0 max-w-[85%]"
                  />
                  <PoweredBy colorLogo="gray" isRight />
                  <NavitationNumber
                    value={3}
                    size="sm"
                    fontFamily="bely"
                    font="bold"
                    position="top-right-corner"
                  />
                </div>

                <div
                  id="page-four"
                  className="relative aspect-[1/1.4] bg-white overflow-hidden pl-16 !pt-[38px]"
                >
                  <LuxuryEliteBackgroundTitle className="z-10 absolute -top-[20px] -left-[20px] w-[353px] h-[350px]" />
                  <div className="gap-6">
                    <div>
                      {commitment?.content ? (
                        <OurCommitement
                          title={commitment.title ?? 'Our Commitment'}
                          content={commitment.content}
                          templateType="luxury_elite"
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
                          templateType="luxury_elite"
                          className={`${montserrat.className} relative z-20`}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No content
                        </div>
                      )}
                    </div>
                  </div>
                  <PoweredBy colorLogo="gray" isRight />
                  <NavitationNumber
                    value={4}
                    size="sm"
                    fontFamily="bely"
                    font="bold"
                    position="top-right-corner"
                  />
                  <LuxuryEliteBackgroundTitle className="z-10 absolute -bottom-[40px] -left-[40px] w-[353px] h-[350px] -rotate-90" />
                </div>

                {/* Page five */}
                <div
                  id="page-five"
                  className="relative aspect-[1/1.4] bg-white overflow-hidden pl-16 !pt-[38px]"
                >
                  <LuxuryEliteBackgroundTitle className="z-10 absolute -top-[20px] -left-[20px] w-[353px] h-[350px]" />
                  <ProposalTitle
                    templateType="luxury_elite"
                    title="Our Qualifications"
                  />
                  <ContentQualificationsSection templateType="luxury_elite" />

                  <NavitationNumber
                    value={5}
                    size="sm"
                    fontFamily="bely"
                    font="bold"
                    position="top-right-corner"
                  />
                </div>

                <div
                  id="page-six"
                  className="relative aspect-[1/1.4] bg-white overflow-hidden pl-16 !pt-[38px]"
                >
                  <LuxuryEliteBackgroundTitle className="z-10 absolute -top-[20px] -left-[20px] w-[353px] h-[350px]" />
                  <div className="gap-6 max-w-[95%]">
                    <div>
                      {scope?.content ? (
                        <ScopeOfService
                          title={scope.title ?? 'Scope of Service'}
                          content={scope.content}
                          templateType="luxury_elite"
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
                          templateType="luxury_elite"
                          className={`${montserrat.className}`}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No content
                        </div>
                      )}
                    </div>
                  </div>
                  <PoweredBy colorLogo="gray" isRight />
                  <NavitationNumber
                    value={6}
                    size="sm"
                    fontFamily="bely"
                    font="bold"
                    position="top-right-corner"
                  />
                </div>

                <div
                  id="page-seven"
                  className="relative aspect-[1/1.4] bg-white overflow-hidden pl-16 !pt-[38px]"
                >
                  <LuxuryEliteBackgroundTitle className="z-10 absolute -top-[20px] -left-[20px] w-[353px] h-[350px]" />
                  <div className="space-y-8 max-w-[95%]">
                    {pricing?.content ? (
                      <ServiceQuotePricing
                        title={pricing.title ?? 'Service Quote & Pricing'}
                        content={pricing.content}
                        description={pricing.description}
                        templateType="luxury_elite"
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
                        templateType="luxury_elite"
                        className={`${arvo.className}`}
                      />
                    ) : null}
                  </div>
                  <PoweredBy colorLogo="gray" isRight />
                  <NavitationNumber
                    value={7}
                    size="sm"
                    fontFamily="bely"
                    font="bold"
                    position="top-right-corner"
                  />
                </div>
              </>
            );
          })()
        : null}

      <div
        id="page-eight"
        className="relative aspect-[1/1.4] bg-white pl-16 pt-[38px] overflow-hidden"
      >
        <LuxuryEliteBackgroundTitle className="z-10 absolute -top-[20px] -left-[20px] w-[353px] h-[350px]" />
        <ProposalTitle templateType="luxury_elite" title="Terms & Legal" />

        <TitleDescriptionSection templateType="luxury_elite" />
        <PoweredBy colorLogo="gray" isRight />
        <NavitationNumber
          value={8}
          size="sm"
          fontFamily="bely"
          font="bold"
          position="top-right-corner"
        />
      </div>

      <div
        id="page-nine"
        className="relative aspect-[1/1.4] bg-white pl-16 pt-[38px] overflow-hidden"
      >
        <LuxuryEliteBackgroundTitle className="z-10 absolute -top-[20px] -left-[20px] w-[353px] h-[350px]" />
        <ProposalTitle
          templateType="luxury_elite"
          title="Proposal Acceptance"
        />
        <SignatureContent templateType="luxury_elite" />
        <SignatureSection templateType="luxury_elite" />
        <PoweredBy colorLogo="gray" isRight />
        <NavitationNumber
          value={9}
          size="sm"
          fontFamily="bely"
          font="bold"
          position="top-right-corner"
        />
      </div>

      <div id="page-ten" className="relative aspect-[1/1.4] bg-white">
        <ThankYouPage
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
