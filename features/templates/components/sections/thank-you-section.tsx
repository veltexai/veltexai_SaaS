import { EmailIcon, PhoneIcon, WebTrafficIcon } from '@/components/icons';
import { arvo, dmSerifText, montserrat } from '@/lib/fonts';
import { TemplateType } from '@/features/templates/types/templates';
import React from 'react';

const ThankYouSection = ({
  templateType,
  email,
  phone,
  website,
}: {
  templateType: TemplateType;
  email: string | null;
  phone: string | null;
  website: string | null;
}) => {
  const fontWeight =
    templateType === 'executive_premium' ? 'font-bold' : 'font-normal';
  const fontFamily =
    templateType === 'luxury_elite' ? arvo.className : montserrat.className;

  return (
    <>
      <div className={`flex-auto flex ${fontFamily} flex-col sm:gap-4 gap-2`}>
        <h1
          className={`sm:text-3xl text-xl font-bold text-[var(--color-primary)] ${
            templateType === 'luxury_elite'
              ? 'tk-bely-display'
              : dmSerifText.className
          }`}
        >
          Thank you
        </h1>
        {templateType !== 'executive_premium' ? (
          <>
            <p className="sm:text-base text-2xs">
              We appreciate the opportunity to support your facility. Our team
              is committed to reliable service, clear communication, and
              measurable results.
            </p>
            <p className="font-bold italic sm:text-base text-2xs">
              We look forward to serving your Cleaning needs with the highest
              standards of care
            </p>
          </>
        ) : (
          <p className="sm:leading-[41px] sm:text-base text-2xs">
            We appreciate the opportunity to support your facility. Our team is
            committed to reliable service, clear communication, and measurable
            results.
          </p>
        )}
        <div className={`flex items-center gap-2 ${fontWeight} ${fontFamily}`}>
          <EmailIcon className="sm:size-6 size-4 text-[var(--color-primary)]" />
          <span className="sm:text-base text-3xs">Email [{email}]</span>
        </div>
        <div className={`flex items-center gap-2 ${fontWeight} ${fontFamily}`}>
          <PhoneIcon className="sm:size-6 size-4 text-[var(--color-primary)]" />
          <span className="sm:text-base text-3xs">Phone: [{phone}]</span>
        </div>
        <div className={`flex items-center gap-2 ${fontWeight} ${fontFamily}`}>
          <WebTrafficIcon className="sm:size-6 size-4 text-[var(--color-primary)]" />
          <span className="sm:text-base text-3xs">Website [{website}]</span>
        </div>
      </div>
    </>
  );
};

export default ThankYouSection;
