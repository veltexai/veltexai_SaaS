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
      className={`relative aspect-[1/1.4] bg-white pt-16 ${
        templateType === 'luxury_elite' ? 'pl-16 !pt-[38px]' : 'pl-30'
      } overflow-hidden`}
    >
      {templateType !== 'luxury_elite' && (
        <>
          <VerticalBar className="left-20" variant="gradientGray" />
          <HorizontalBar className="bottom-20" variant="gradientGray" />
        </>
      )}

      <ProposalTitle templateType={templateType} title="Table of contents" />
      <TOCSection templateType={templateType} />

      {templateType === 'luxury_elite' && (
        <>
          <div className="z-10 absolute bottom-0 right-0 h-[400px]">
            <Image
              src="/images/templates/Images/Mask group-1.png"
              alt="Table of Contents"
              className=" object-contain"
              height={1600}
              width={1100}
            />
            <PoweredBy colorLogo="white" isRight template="luxury_elite" />
          </div>
          <LuxuryEliteBackgroundTitle className="z-10 absolute -top-[20px] -left-[20px] w-[353px] h-[350px]" />
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
