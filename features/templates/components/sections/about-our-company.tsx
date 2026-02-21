import React from "react";
import { TemplateType } from "@/features/templates/types/templates";
import ProposalTitle from "../shared/proposal-title";
import { parseInline } from "../../utils/parse-inline";
import { LuxuryEliteBullets, StandardBullets } from "../index";

interface AboutOurCompanyProps {
  title: string;
  content: string;
  templateType: TemplateType;
  className?: string;
}

export default function AboutOurCompany({
  title,
  content,
  templateType,
  className = "",
}: AboutOurCompanyProps) {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const firstParagraphIndex = lines.findIndex((l) => !/^[-*]\s+/.test(l));
  const bullets = lines
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, ""));
  const firstParagraph =
    firstParagraphIndex >= 0 ? lines[firstParagraphIndex] : "";

  return (
    <section>
      <div className={className}>
        <ProposalTitle templateType={templateType} title={title} />
        {firstParagraph ? (
          <p className="sm:text-sm text-2xs text-[#383838] sm:mb-4 mb-2 leading-relaxed mt-4 sm:mt-8">
            {parseInline(firstParagraph)}
          </p>
        ) : null}
        {bullets.length ? (
          templateType === "luxury_elite" ? (
            <LuxuryEliteBullets bullets={bullets} />
          ) : (
            <StandardBullets bullets={bullets} />
          )
        ) : null}
      </div>
    </section>
  );
}
