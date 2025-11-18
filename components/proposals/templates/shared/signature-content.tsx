import { arvo, montserrat } from '@/lib/fonts';
import { TemplateType } from '@/types/templates';
import React from 'react';

const SignatureContent = ({ templateType }: { templateType: TemplateType }) => {
  const fontFamily =
    templateType !== 'luxury_elite' ? montserrat.className : arvo.className;
  const fontWeight =
    templateType !== 'luxury_elite' ? 'font-bold' : 'font-normal';
  return (
    <div
      className={`flex flex-col gap-10 py-16 ${
        templateType === 'luxury_elite' ? 'pt-46 pl-6 max-w-[90%]' : ''
      }`}
    >
      <p className={`${fontFamily} text-sm`}>
        By signing below, Client authorizes services as described and agrees to
        the terms herein. A countersigned copy will be provided for your
        records.
      </p>
      <p className={`${fontFamily} ${fontWeight} text-sm`}>
        Client/Authorized Representative
      </p>
    </div>
  );
};

export default SignatureContent;
