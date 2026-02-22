"use client";

import type { TemplateProps } from "@/features/templates/types/templates";
import Image from "next/image";
import { montserrat } from "@/lib/fonts";
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
  HorizontalBar,
  VerticalBar,
} from "./shared";
import {
  AboutOurCompany,
  Addons,
  Notes,
  OurCommitement,
  ProposalTableOfContents,
  ScopeOfService,
  ServiceQuotePricing,
  WhyChooseUs,
} from "./sections";
import { type ScopeRow } from "../utils/split-scope-rows";
import { useTemplateData } from "../hooks/use-template-data";

export function ModernCorporateTemplate({
  proposal,
  branding,
  pages,
  print,
}: TemplateProps) {
  const {
    branding: b,
    preparedFor,
    content,
    scopeRowChunks,
    hasAdditionalScopePages,
  } = useTemplateData(proposal, branding, pages, print);

  return (
    <section className="space-y-6">
      <div
        id="page-one"
        className="relative aspect-[1/1.4] bg-white overflow-hidden"
      >
        <HorizontalBar className="sm:!bottom-[58px] !bottom-[12px] !h-[1px]" />
        <HorizontalBar className="sm:!bottom-32 !bottom-9 !h-[1px]" />
        <div className="relative z-10 sm:w-40 w-18 sm:h-[calc(100%-170px)] h-[calc(100%-120px)] sm:left-15 left-8 sm:-bottom-[112px] -bottom-[108px]">
          <VerticalBar
            className="-right-[1px] sm:!top-[260px] !top-[40px] !w-[1px]"
            variant="white"
            modernCorporate={true}
          />
          <VerticalBar
            className="!-left-[1px] sm:!top-[260px] !top-[40px] !w-[1px]"
            variant="white"
            modernCorporate={true}
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
            modernCorporate={true}
          />
          <VerticalBar
            className="-left-[1px] bottom-[260px] !w-[1px]"
            variant="normal"
            modernCorporate={true}
          />
        </div>
        <div className="absolute w-[90%] h-[40%] sm:bottom-8 bottom-0 left-1/2 -translate-x-1/2">
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
        {b.logoUrl ? (
          <HeaderLogo
            logoUrl={b.logoUrl}
            companyName={b.companyName}
            isTop
            withoutGradient
            position="center"
          />
        ) : null}
        <div className="absolute sm:top-28 top-6 sm:right-10 right-5 max-w-[64%]">
          <HeaderTemplate
            title={proposal.title}
            date={proposal.created_at}
            preparedFor={preparedFor}
            address={proposal.service_location}
            serviceLocation={proposal.regional_location ?? ""}
            city={proposal.city ?? ""}
            textColor="text-[#383838]"
            colorBorder="bg-[#383838]"
            gap="gap-2"
            template="modern_corporate"
          />
        </div>
      </div>

      <ProposalTableOfContents templateType="modern_corporate" />

      {content.about || content.commitment || content.whyUs || content.scope || content.addons || content.pricing || content.notes
        ? (() => {
            return (
              <>
                <div
                  id="page-three"
                  className="relative aspect-[1/1.4] bg-white sm:pt-16 pt-10 sm:pl-30 pl-16 sm:pb-0 pb-10"
                >
                  <div>
                    {content.about?.content ? (
                      <AboutOurCompany
                        title={content.about.title ?? "About Our Company"}
                        content={content.about.content}
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
                    className="z-30 absolute sm:bottom-20 bottom-6 sm:left-20 left-6 max-w-[85%]"
                    priority
                    unoptimized
                  />
                  <VerticalBar variant="gradientGray" />
                  <HorizontalBar variant="gradientGray" />
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
                  className="relative h-full bg-white sm:pt-16 pt-10 sm:pl-30 pl-16 sm:pb-20 pb-10"
                >
                  <div className="max-w-[95%]">
                    <div>
                      {content.commitment?.content ? (
                        <OurCommitement
                          title={content.commitment.title ?? "Our Commitment"}
                          content={content.commitment.content}
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
                      {content.whyUs?.content ? (
                        <WhyChooseUs
                          title={content.whyUs.title ?? "Why Choose Us"}
                          content={content.whyUs.content}
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
                  <VerticalBar variant="gradientGray" />
                  <HorizontalBar variant="gradientGray" />
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
                  className="relative sm:aspect-[1/1.4] aspect-[1/1.74] bg-white sm:pt-16 pt-10 sm:pl-30 pl-16 sm:pb-0 pb-10"
                >
                  <VerticalBar variant="gradientGray" />
                  <HorizontalBar variant="gradientGray" />
                  <ProposalTitle
                    templateType="modern_corporate"
                    title="Our Qualifications"
                  />
                  <ContentQualificationsSection templateType="modern_corporate" />

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
                  className="relative aspect-[1/1.4] bg-white sm:pt-16 pt-10 sm:pl-30 pl-16 sm:pb-0 pb-10"
                >
                  <div className="max-w-[95%]">
                    {content.scope?.content ? (
                      <ScopeOfService
                        title={content.scope.title ?? "Scope of Service"}
                        content={content.scope.content}
                        templateType="modern_corporate"
                        className={`${montserrat.className}`}
                        description={content.scope.description || ""}
                        overrideRows={
                          hasAdditionalScopePages
                            ? scopeRowChunks[0]
                            : undefined
                        }
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No content
                      </div>
                    )}
                  </div>
                  {!hasAdditionalScopePages && (
                    <div className="max-w-[95%]">
                      {content.addons?.content ? (
                        <Addons
                          title={content.addons.title ?? "Add-ons"}
                          content={content.addons.content}
                          templateType="modern_corporate"
                          className={`${montserrat.className}`}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No content
                        </div>
                      )}
                    </div>
                  )}
                  <VerticalBar variant="gradientGray" />
                  <HorizontalBar variant="gradientGray" />
                  <PoweredBy colorLogo="gray" isRight />
                  <NavitationNumber
                    value={6}
                    size="lg"
                    fontFamily="dmSerifText"
                    font="bold"
                    position="bottom-left-corner"
                  />
                </div>

                {/* Scope overflow pages */}
                {hasAdditionalScopePages &&
                  scopeRowChunks
                    .slice(1)
                    .map((rowChunk: ScopeRow[], chunkIndex: number) => {
                      const isLastScopeOverflowPage =
                        chunkIndex === scopeRowChunks.length - 2;
                      return (
                        <div
                          key={`scope-overflow-${chunkIndex}`}
                          id={`page-six-overflow-${chunkIndex + 1}`}
                          className="relative aspect-[1/1.4] bg-white sm:pt-16 pt-10 sm:pl-30 pl-16 sm:pb-0 pb-10"
                        >
                          <div className="max-w-[95%]">
                            <ScopeOfService
                              title={content.scope?.title ?? "Scope of Service"}
                              content={content.scope?.content ?? ""}
                              templateType="modern_corporate"
                              className={`${montserrat.className}`}
                              description=""
                              overrideRows={rowChunk}
                              isContinuation
                            />
                          </div>
                          {isLastScopeOverflowPage && content.addons?.content && (
                            <div className="max-w-[95%] mt-6">
                              <Addons
                                title={content.addons.title ?? "Add-ons"}
                                content={content.addons.content}
                                templateType="modern_corporate"
                                className={`${montserrat.className}`}
                              />
                            </div>
                          )}
                          <VerticalBar variant="gradientGray" />
                          <HorizontalBar variant="gradientGray" />
                          <PoweredBy colorLogo="gray" isRight />
                          <NavitationNumber
                            value={6}
                            size="lg"
                            fontFamily="dmSerifText"
                            font="bold"
                            position="bottom-left-corner"
                          />
                        </div>
                      );
                    })}

                <div
                  id="page-seven"
                  className="relative h-full bg-white sm:pt-16 pt-10 sm:pl-30 pl-16 sm:pb-26 pb-10"
                >
                  <div className="max-w-[95%] sm:space-y-8 space-y-4">
                    {content.pricing?.content ? (
                      <ServiceQuotePricing
                        title={content.pricing.title ?? "Service Quote & Pricing"}
                        content={content.pricing.content}
                        description={content.pricing.description}
                        templateType="modern_corporate"
                        className={`${montserrat.className}`}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground"></div>
                    )}
                    {content.notes?.content ? (
                      <Notes
                        title={content.notes.title ?? "Notes"}
                        content={content.notes.content}
                        templateType="modern_corporate"
                        className={`${montserrat.className}`}
                      />
                    ) : null}
                  </div>
                  <VerticalBar variant="gradientGray" />
                  <HorizontalBar variant="gradientGray" />
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
        className="relative h-full bg-white sm:pt-16 pt-10 sm:pl-30 pl-16 sm:pb-22 pb-10"
      >
        <VerticalBar variant="gradientGray" />
        <HorizontalBar variant="gradientGray" />
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
        className="relative sm:aspect-[1/1.4] aspect-[1/1.5] bg-white sm:pt-16 pt-10 sm:pl-30 pl-16 sm:pb-0 pb-10"
      >
        <VerticalBar variant="normal" />
        <HorizontalBar variant="normal" />
        <ProposalTitle
          templateType="modern_corporate"
          title="Proposal Acceptance"
        />
        <SignatureContent templateType="modern_corporate" />
        <SignatureSection
          templateType="modern_corporate"
          companyName={proposal.client_company || b.companyName}
          clientName={proposal.client_name}
        />
        <PoweredBy colorLogo="gray" isRight />
        <NavitationNumber
          value={9}
          size="lg"
          fontFamily="dmSerifText"
          font="bold"
          position="bottom-left-corner"
        />
      </div>

      <div
        id="page-ten"
        className="relative sm:aspect-[1/1.4] aspect-[1/1.7] bg-white"
      >
        <ThankYouPage
          email={b.email}
          phone={b.phone}
          website={b.website}
          logoUrl={b.logoUrl}
          companyName={b.companyName}
          templateType="modern_corporate"
        />
      </div>
    </section>
  );
}
