"use client";

import { useMemo } from "react";
import type { TemplateProps } from "@/features/templates/types/templates";
import Image from "next/image";
import { formatDateLong } from "@/lib/utils";
import { arvo, montserrat } from "@/lib/fonts";
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
} from "./shared";
import {
  AboutOurCompany,
  Addons,
  Notes,
  OurCommitement,
  ScopeOfService,
  ServiceQuotePricing,
  WhyChooseUs,
  TableOfContents,
} from "./sections";
import { LuxuryEliteBackgroundTitle } from "@/components/icons";
import { useSplitContent } from "../hooks/use-split-content";
import {
  parseScopeTableData,
  splitScopeRows,
  type ScopeRow,
} from "../utils/split-scope-rows";

export function LuxuryEliteTemplate({
  proposal,
  branding,
  pages,
  print,
}: TemplateProps) {
  const logoUrl = branding?.logo_url ?? null;
  const phone = branding?.phone ?? null;
  const website = branding?.website ?? null;
  const companyName = branding?.name ?? "Company";
  const email = branding?.email ?? null;
  const preparedFor =
    proposal.client_company || proposal.client_name || "Client";

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

  // Calculate scope row chunks for PDF pagination
  const scopeRowChunks = useMemo(() => {
    if (!scope?.content) return [];
    const tableData = parseScopeTableData(scope.content);
    if (!tableData) return [];
    return splitScopeRows(tableData, 8, 14);
  }, [scope?.content]);

  const hasAdditionalScopePages = scopeRowChunks.length > 1;

  return (
    <section className="space-y-6">
      <div
        id="page-one"
        className="relative aspect-[1/1.4] bg-white overflow-hidden"
      >
        <p
          className={`absolute sm:-right-[48px] -right-[38px] sm:top-[88.5px] top-[58.5px] -rotate-90 z-30 text-white sm:text-sm text-xs ${montserrat.className}`}
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

        <div className="absolute sm:top-50 top-21 sm:left-20 left-10 max-w-[75%]">
          <HeaderTemplate
            title={proposal.title}
            date={proposal.created_at}
            preparedFor={preparedFor}
            address={proposal.service_location}
            serviceLocation={proposal.regional_location ?? ""}
            city={proposal.city ?? ""}
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
                  className="relative sm:aspect-[1/1.4] aspect-[1/1.54] bg-white overflow-hidden sm:pl-16 pl-10 !pt-[38px] sm:pb-0 pb-10"
                >
                  <div className="sm:max-w-[80%] max-w-[90%] absolute sm:bottom-5 bottom-0 sm:right-15 right-5">
                    {about?.content ? (
                      <AboutOurCompany
                        title={about.title ?? "About Our Company"}
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
                    className="z-30 absolute top-0 left-0 sm:max-w-[85%] max-w-[75%]"
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
                  className="relative h-full bg-white overflow-hidden sm:pl-16 pl-10 sm:!pt-[38px] pt-10 sm:pb-10 pb-10"
                >
                  <LuxuryEliteBackgroundTitle className="z-10 absolute sm:-top-[20px] -top-[10px] sm:-left-[20px] -left-[10px] sm:w-[353px] w-[253px] sm:h-[350px] h-[250px]" />
                  <div className="gap-6">
                    <div>
                      {commitment?.content ? (
                        <OurCommitement
                          title={commitment.title ?? "Our Commitment"}
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
                    <div className="sm:mt-10 mt-4">
                      {whyUs?.content ? (
                        <WhyChooseUs
                          title={whyUs.title ?? "Why Choose Us"}
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
                  <LuxuryEliteBackgroundTitle className="z-10 absolute sm:-bottom-[40px] -bottom-[20px] sm:-left-[40px] -left-[20px] sm:w-[353px] w-[253px] sm:h-[350px] h-[250px] -rotate-90" />
                </div>

                {/* Page five */}
                <div
                  id="page-five"
                  className="relative sm:aspect-[1/1.4] aspect-[1/1.54] bg-white overflow-hidden sm:pl-16 pl-12 sm:!pt-[38px] pt-10 sm:pb-0 pb-10"
                >
                  <LuxuryEliteBackgroundTitle className="z-10 absolute sm:-top-[20px] -top-[10px] sm:-left-[20px] -left-[10px] sm:w-[353px] w-[253px] sm:h-[350px] h-[250px]" />
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

                {/* Page six - Scope of Service (with PDF pagination support) */}
                <div
                  id="page-six"
                  className="relative sm:aspect-[1/1.4] h-full bg-white overflow-hidden sm:pl-16 pl-12 sm:!pt-[38px] pt-10 sm:pb-0 pb-10"
                >
                  <LuxuryEliteBackgroundTitle className="z-10 absolute sm:-top-[20px] -top-[10px] sm:-left-[20px] -left-[10px] sm:w-[353px] w-[253px] sm:h-[350px] h-[250px]" />
                  <div className="gap-6 max-w-[95%]">
                    <div>
                      {scope?.content ? (
                        <ScopeOfService
                          title={scope.title ?? "Scope of Service"}
                          content={scope.content}
                          templateType="luxury_elite"
                          className={`${montserrat.className}`}
                          description={scope.description || ""}
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
                      <div>
                        {addons?.content ? (
                          <Addons
                            title={addons.title ?? "Add-ons"}
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
                    )}
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
                          className="relative aspect-[1/1.4] bg-white overflow-hidden sm:pl-16 pl-12 sm:!pt-[38px] pt-10 sm:pb-0 pb-10"
                        >
                          <LuxuryEliteBackgroundTitle className="z-10 absolute sm:-top-[20px] -top-[10px] sm:-left-[20px] -left-[10px] sm:w-[353px] w-[253px] sm:h-[350px] h-[250px]" />
                          <div className="gap-6 max-w-[95%]">
                            <div>
                              <ScopeOfService
                                title={scope?.title ?? "Scope of Service"}
                                content={scope?.content ?? ""}
                                templateType="luxury_elite"
                                className={`${montserrat.className}`}
                                description=""
                                overrideRows={rowChunk}
                                isContinuation
                              />
                            </div>
                            {isLastScopeOverflowPage && addons?.content && (
                              <div className="mt-6">
                                <Addons
                                  title={addons.title ?? "Add-ons"}
                                  content={addons.content}
                                  templateType="luxury_elite"
                                  className={`${montserrat.className}`}
                                />
                              </div>
                            )}
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
                      );
                    })}

                <div
                  id="page-seven"
                  className="relative h-full bg-white overflow-hidden sm:pl-16 pl-12 sm:!pt-[38px] pt-10 sm:pb-26 pb-10"
                >
                  <LuxuryEliteBackgroundTitle className="z-10 absolute sm:-top-[20px] -top-[10px] sm:-left-[20px] -left-[10px] sm:w-[353px] w-[253px] sm:h-[350px] h-[250px]" />
                  <div className="space-y-8 max-w-[95%]">
                    {pricing?.content ? (
                      <ServiceQuotePricing
                        title={pricing.title ?? "Service Quote & Pricing"}
                        content={pricing.content}
                        description={pricing.description}
                        templateType="luxury_elite"
                        className={`${montserrat.className}`}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground"></div>
                    )}
                    {notes?.content ? (
                      <Notes
                        title={notes.title ?? "Notes"}
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
        className="relative h-full bg-white sm:pl-16 pl-12 sm:!pt-[38px] pt-10 sm:pb-22 pb-10 overflow-hidden"
      >
        <LuxuryEliteBackgroundTitle className="z-10 absolute sm:-top-[20px] -top-[10px] sm:-left-[20px] -left-[10px] sm:w-[353px] w-[253px] sm:h-[350px] h-[250px]" />
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
        className="relative sm:aspect-[1/1.4] h-full bg-white sm:pl-16 pl-12 sm:!pt-[38px] pt-10 sm:pb-0 pb-10 overflow-hidden"
      >
        <LuxuryEliteBackgroundTitle className="z-10 absolute sm:-top-[20px] -top-[10px] sm:-left-[20px] -left-[10px] sm:w-[353px] w-[253px] sm:h-[350px] h-[250px]" />
        <ProposalTitle
          templateType="luxury_elite"
          title="Proposal Acceptance"
        />
        <SignatureContent templateType="luxury_elite" />
        <SignatureSection
          templateType="luxury_elite"
          companyName={proposal.client_company || companyName}
          clientName={proposal.client_name}
        />
        <PoweredBy colorLogo="gray" isRight />
        <NavitationNumber
          value={9}
          size="sm"
          fontFamily="bely"
          font="bold"
          position="top-right-corner"
        />
      </div>

      <div
        id="page-ten"
        className="relative sm:aspect-[1/1.4] aspect-[1/1.7] bg-white"
      >
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
