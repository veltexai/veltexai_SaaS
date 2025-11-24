import { dmSerifText, arvo } from '@/lib/fonts';
import { TemplateType } from '@/features/templates/types/templates';
import { dataTOC } from '@/lib/templates/content';
import React from 'react';

const TOCSection = ({ templateType }: { templateType: TemplateType }) => {
  return (
    <div
      className={`pl-25 ${
        templateType === 'luxury_elite' ? 'pt-10' : ' pt-20'
      }`}
    >
      {dataTOC.map((item) => (
        <div key={item.id} className="flex items-center justify-start my-6">
          <span
            className={`text-[var(--color-primary)] w-[80px] text-4xl  ${
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
            } pl-9 text-xl font-normal text-[#383838]`}
          >
            {item.title}
          </span>
        </div>
      ))}
    </div>
  );
};

export default TOCSection;
