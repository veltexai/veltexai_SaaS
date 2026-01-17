import { arvo, montserrat } from '@/lib/fonts';
import { TemplateType } from '@/features/templates/types/templates';
import React from 'react';

const SignatureContent = ({ templateType }: { templateType: TemplateType }) => {
  const fontFamily =
    templateType !== 'luxury_elite' ? montserrat.className : arvo.className;
  const fontWeight =
    templateType !== 'luxury_elite' ? 'font-bold' : 'font-normal';
  return (
    <div
      className={`flex flex-col sm:gap-10 gap-6 sm:py-16 py-6 ${
        templateType === 'luxury_elite' ? 'sm:pt-46 pt-16 pl-6 max-w-[90%]' : 'sm:pl-0 pl-6'
      }`}
    >
      <p className={`${fontFamily} sm:text-sm text-2xs`}>
        By signing below, Client authorizes services as described and agrees to
        the terms herein. A countersigned copy will be provided for your
        records.
      </p>
      <p className={`${fontFamily} ${fontWeight} sm:text-sm text-xs`}>
        Client/Authorized Representative
      </p>
    </div>
  );
};

export default SignatureContent;
