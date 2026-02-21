import { dmSerifText } from '@/lib/fonts';
import { TemplateType } from '@/features/templates/types/templates';
import React from 'react';

interface SignatureField {
  label: string;
  value?: string;        
  noWrap?: boolean;    
}

interface SignatureSectionProps {
  templateType: TemplateType;
  companyName: string;
  clientName: string;  
}


const SignatureSection = ({ templateType, companyName, clientName}: SignatureSectionProps) => {
  const fontFamily =
    templateType !== 'luxury_elite' ? dmSerifText.className : 'tk-bely-display';

    const SIGNATURE_FIELDS: SignatureField[] = [
      { label: 'Client Name',       value: clientName },
      { label: 'Company',           value: companyName },
      { label: 'Title' },
      { label: 'Printed Name',      noWrap: true },
      { label: 'Service Start Date' },
      { label: 'Date' },
      { label: 'Signature' },
    ];

  return (
    <section
      aria-labelledby="signature-section-title"
      className={`flex flex-col gap-4 ${
        templateType === 'luxury_elite' ? 'pl-6' : 'sm:pl-10 sm:pr-0 pl-0 pr-4'
      }`}
    >
      {SIGNATURE_FIELDS.map(({ label, value, noWrap }) => (
        <div key={label} className="flex items-center justify-start sm:gap-10 gap-4">
          <p
            className={`${fontFamily} sm:text-xl text-sm w-[120px] ${
              noWrap ? 'sm:whitespace-nowrap whitespace-normal' : ''
            }`}
          >
            {label}:
          </p>
          <div className="sm:h-[55px] h-[35px] w-[60%] border border-[#110051] rounded-3xl flex items-center justify-center">
            {value && <p className="sm:text-sm text-2xs">{value}</p>}
          </div>
        </div>
      ))}   
    </section>
  );
};

export { SignatureSection };
