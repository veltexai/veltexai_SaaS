import { dmSerifText, arvo } from '@/lib/fonts';
import { TemplateType } from '@/types/templates';
import React from 'react';

const TOCSection = ({ templateType }: { templateType: TemplateType }) => {
  const dataTOC = [
    {
      id: 'about-our-company',
      number: '03',
      title: 'About Our Company',
    },
    {
      id: 'our-commitment',
      number: '04',
      title: 'Our Commitment',
    },
    {
      id: 'why-choose-us',
      number: '04',
      title: 'Why Choose Us',
    },
    {
      id: 'our-qualifications',
      number: '05',
      title: 'Our Qualifications',
    },
    {
      id: 'scope-of-work',
      number: '06',
      title: 'Scope of Work',
    },
    {
      id: 'service-quote-pricing',
      number: '07',
      title: 'Service Quote & Pricing',
    },
    {
      id: 'terms-legal',
      number: '08',
      title: 'Terms & Legal',
    },
    {
      id: 'proposal-acceptance',
      number: '09',
      title: 'Proposal Acceptance',
    },
    {
      id: 'thank-you-contact',
      number: '10',
      title: 'Thank You / Contact',
    },
  ];
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
