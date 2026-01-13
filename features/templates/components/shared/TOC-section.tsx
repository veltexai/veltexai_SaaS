import { dmSerifText, arvo } from '@/lib/fonts';
import { TemplateType } from '@/features/templates/types/templates';
import { dataTOC } from '@/lib/templates/content';
import React from 'react';

const TOCSection = ({ templateType }: { templateType: TemplateType }) => {
  return (
    <div
      className={`sm:pl-25 pl-10 ${
        templateType === 'luxury_elite' ? 'sm:pt-10 pt-4' : ' pt-4 sm:pt-20'
      }`}
    >
      {dataTOC.map((item) => (
        <div key={item.id} className="flex items-center justify-start my-2 sm:my-6">
          <span
            className={`text-[var(--color-primary)] w-[80px] text-3xl sm:text-4xl  ${
              templateType === 'luxury_elite'
                ? 'tk-bely-display font-black'
                : `${dmSerifText.className} font-bold`
            } border-r`}
          >
            {item.number}
          </span>
          <span
            className={`${
              templateType === 'luxury_elite' ? arvo.className : ''
            } pl-9 text-base sm:text-xl font-normal text-[#383838]`}
          >
            {item.title}
          </span>
        </div>
      ))}
    </div>
  );
};

export default TOCSection;
