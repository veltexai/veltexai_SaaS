"use client";

import type { TemplateProps } from "@/features/templates/types/templates";
import Image from "next/image";
import {
  HeaderLogo,
  HeaderTemplate,
  PoweredBy,
  VerticalBar,
  HorizontalBar,
  NavitationNumber,
  SignatureSection,
  SignatureContent,
  TitleDescriptionSection,
  ContentQualificationsSection,
  ProposalTableOfContents,
  ProposalTitle,
  ThankYouPage,
} from "./shared";
import { montserrat } from "@/lib/fonts";
import {
  AboutOurCompany,
  Addons,
  Notes,
  OurCommitement,
  ScopeOfService,
  ServiceQuotePricing,
  WhyChooseUs,
} from "./sections";
import { type ScopeRow } from "../utils/split-scope-rows";
import { useTemplateData } from "../hooks/use-template-data";

export function ExecutivePremiumTemplate({
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
        {b.logoUrl ? (
          <HeaderLogo
            logoUrl={b.logoUrl}
            companyName={b.companyName}
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
            serviceLocation={proposal.regional_location ?? ""}
            city={proposal.city ?? ""}
            textColor="text-[var(--color-primary)]"
            colorBorder="from-[var(--color-primary)] to-[var(--color-primary)]"
            gap="gap-2"
          />
        </div>
      </div>
      {/* Page Two */}
      <ProposalTableOfContents templateType="executive_premium" />
      {/* Content Pages: AI-split */}
      {content.loading && (
        <div className="relative aspect-[1/1.4] bg-white p-8">
          <div className="text-sm text-muted-foreground">Loading content…</div>
        </div>
      )}
      {content.error && (
        <div className="relative aspect-[1/1.4] bg-white p-8">
          <div className="text-sm text-red-600">{content.error}</div>
        </div>
      )}
      {content.about ||
      content.commitment ||
      content.whyUs ||
      content.scope ||
      content.addons ||
      content.pricing ||
      content.notes
        ? (() => {
            return (
              <>
                <div
                  id="page-three"
                  className="relative aspect-[1/1.4] bg-white p-4 sm:p-8"
                >
                  <div className="max-w-none pl-10 sm:pl-[95px]">
                    {content.about?.content ? (
                      <AboutOurCompany
                        title={content.about.title ?? "About Our Company"}
                        content={content.about.content}
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
                  className="relative h-full bg-white p-6 sm:p-8 sm:pb-20 pb-10"
                >
                  <div className="gap-6 pl-10 sm:pl-[95px]">
                    <div>
                      {content.commitment?.content ? (
                        <OurCommitement
                          title={content.commitment.title ?? "Our Commitment"}
                          content={content.commitment.content}
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
                      {content.whyUs?.content ? (
                        <WhyChooseUs
                          title={content.whyUs.title ?? "Why Choose Us"}
                          content={content.whyUs.content}
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
                  className="relative sm:aspect-[1/1.4] aspect-[1/1.62] bg-white sm:pt-16 pt-6 pl-10 sm:pl-30"
                >
                  <VerticalBar variant="gradientGray" />
                  <HorizontalBar variant="gradientGray" />

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

                {/* Page six - Scope of Service (with PDF pagination support) */}
                <div
                  id="page-six"
                  className="relative aspect-[1/1.4] bg-white sm:p-8 p-6 sm:pb-26 pb-10"
                >
                  <div className="gap-6 pl-10 sm:pl-[95px]">
                    <div>
                      {content.scope?.content ? (
                        <ScopeOfService
                          title={content.scope.title ?? "Scope of Service"}
                          content={content.scope.content}
                          templateType="executive_premium"
                          className={`${montserrat.className}`}
                          description={content.scope.description || ""}
                          overrideRows={
                            hasAdditionalScopePages
                              ? scopeRowChunks[0]
                              : undefined
                          }
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground"></div>
                      )}
                    </div>
                    {/* Only show addons on first page if scope doesn't overflow */}
                    {!hasAdditionalScopePages && (
                      <div>
                        {content.addons?.content ? (
                          <Addons
                            title={content.addons.title ?? "Add-ons"}
                            content={content.addons.content}
                            templateType="executive_premium"
                            className={`${montserrat.className}`}
                          />
                        ) : (
                          <div className="text-sm text-muted-foreground"></div>
                        )}
                      </div>
                    )}
                  </div>
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

                {/* Scope overflow pages - render additional pages for remaining rows */}
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
                          className="relative aspect-[1/1.4] bg-white sm:p-8 p-6 sm:pb-26 pb-10"
                        >
                          <div className="gap-6 pl-10 sm:pl-[95px]">
                            <div>
                              <ScopeOfService
                                title={
                                  content.scope?.title ?? "Scope of Service"
                                }
                                content={content.scope?.content ?? ""}
                                templateType="executive_premium"
                                className={`${montserrat.className}`}
                                description=""
                                overrideRows={rowChunk}
                                isContinuation
                              />
                            </div>
                            {/* Show addons on the last scope overflow page */}
                            {isLastScopeOverflowPage &&
                              content.addons?.content && (
                                <div className="mt-6">
                                  <Addons
                                    title={content.addons.title ?? "Add-ons"}
                                    content={content.addons.content}
                                    templateType="executive_premium"
                                    className={`${montserrat.className}`}
                                  />
                                </div>
                              )}
                          </div>
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
                  className="relative h-full bg-white sm:p-8 p-6 sm:pb-26 pb-10"
                >
                  <div className="max-w-none sm:pl-[95px] pl-10 space-y-8">
                    {content.pricing?.content ? (
                      <ServiceQuotePricing
                        title={
                          content.pricing.title ?? "Service Quote & Pricing"
                        }
                        content={content.pricing.content}
                        description={content.pricing.description}
                        templateType="executive_premium"
                        className={`${montserrat.className}`}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground"></div>
                    )}
                    {content.notes?.content ? (
                      <Notes
                        title={content.notes.title ?? "Notes"}
                        content={content.notes.content}
                        templateType="executive_premium"
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

      {/* Page Eight */}
      <div
        id="page-eight"
        className="relative h-full bg-white sm:pt-16 pt-6 sm:pl-30 pl-10 sm:pb-22 pb-10"
      >
        <VerticalBar variant="gradientGray" />
        <HorizontalBar variant="gradientGray" />

        <div className="pl-6 sm:pl-0">
          <ProposalTitle
            templateType="executive_premium"
            title="Terms & Legal"
          />
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
        <VerticalBar variant="gradientGray" />
        <HorizontalBar variant="gradientGray" />

        <div className="pl-6 sm:pl-0">
          <ProposalTitle
            templateType="executive_premium"
            title="Proposal Acceptance"
          />
        </div>

        <SignatureContent templateType="executive_premium" />

        <SignatureSection
          templateType="executive_premium"
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

      {/* Page Ten */}
      <div id="page-ten" className="relative aspect-[1/1.4] bg-white">
        <ThankYouPage
          email={b.email}
          phone={b.phone}
          website={b.website}
          logoUrl={b.logoUrl}
          companyName={b.companyName}
          templateType="executive_premium"
        />
      </div>
    </section>
  );
}
