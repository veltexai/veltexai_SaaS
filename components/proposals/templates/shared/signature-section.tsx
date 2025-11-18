import { dmSerifText } from '@/lib/fonts';
import { TemplateType } from '@/types/templates';
import React from 'react';

const SignatureSection = ({ templateType }: { templateType: TemplateType }) => {
  const fontFamily =
    templateType !== 'luxury_elite' ? dmSerifText.className : 'tk-bely-display';

  return (
    <div
      className={`flex flex-col gap-6 ${
        templateType === 'luxury_elite' ? 'pl-6' : ''
      }`}
    >
      <div className="flex items-center justify-start gap-10">
        <p className={`${fontFamily} text-2xl w-[120px]`}>Company:</p>
        <div className="h-[65px] w-[60%] border border-[#110051] rounded-3xl"></div>
      </div>
      <div className="flex items-center justify-start gap-10">
        <p className={`${fontFamily} text-2xl w-[120px]`}>Date:</p>
        <div className="h-[65px] w-[60%] border border-[#110051] rounded-3xl"></div>
      </div>
      <div className="flex items-center justify-start gap-10">
        <p className={`${fontFamily} text-2xl w-[120px]`}>Signature:</p>
        <div className="h-[65px] w-[60%] border border-[#110051] rounded-3xl"></div>
      </div>
    </div>
  );
};

export default SignatureSection;
