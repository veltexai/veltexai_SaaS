import { TemplateType } from '@/features/templates/types/templates';
import React from 'react';
import Image from 'next/image';
import { LuxuryEliteBackgroundTitle } from '@/components/icons';
import {
  NavitationNumber,
  PoweredBy,
  TOCSection,
  HorizontalBar,
  VerticalBar,
  ProposalTitle,
} from '../shared';

const TableOfContents = ({ templateType }: { templateType: TemplateType }) => {
  return (
    <div
      className={`relative aspect-[1/1.4] bg-white sm:pt-16 pt-10 ${
        templateType === 'luxury_elite' ? 'sm:pl-16 pl-10 sm:aspect-[1/1.4] aspect-[1/1.78]' : 'pl-16 sm:pl-30'
      } overflow-hidden`}
    >
      {templateType !== 'luxury_elite' && (
        <>
          <VerticalBar  variant="gradientGray" />
          <HorizontalBar variant="gradientGray" />
        </>
      )}

      <ProposalTitle templateType={templateType} title="Table of contents" />
      <TOCSection templateType={templateType} />

      {templateType === 'luxury_elite' && (
        <>
          <div className="z-10 absolute bottom-0 right-0 sm:h-[400px] h-[220px]">
            <Image
              src="/images/templates/Images/Mask group-1.png"
              alt="Table of Contents"
              className=" object-contain"
              height={1600}
              width={1100}
            />
            <PoweredBy colorLogo="white" isRight template="luxury_elite" />
          </div>
          <LuxuryEliteBackgroundTitle className="z-10 absolute sm:-top-[20px] -top-[10px] sm:-left-[20px] -left-[10px] sm:w-[353px] w-[253px] sm:h-[350px] h-[250px]" />
        </>
      )}
      {templateType === 'luxury_elite' && (
        <NavitationNumber
          value={2}
          size="sm"
          fontFamily="bely"
          font="bold"
          position="top-right-corner"
        />
      )}
    </div>
  );
};

export default TableOfContents;
