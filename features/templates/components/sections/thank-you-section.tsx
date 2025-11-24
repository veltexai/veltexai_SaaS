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
    templateType === 'modern_corporate' ? 'font-bold' : 'font-normal';
  const fontFamily =
    templateType === 'luxury_elite' ? arvo.className : montserrat.className;

  return (
    <>
      <div className={`flex-auto flex ${fontFamily} flex-col gap-4`}>
        <h1
          className={`text-3xl font-bold text-[var(--color-primary)] ${
            templateType === 'luxury_elite'
              ? 'tk-bely-display'
              : dmSerifText.className
          }`}
        >
          Thank you
        </h1>
        {templateType !== 'modern_corporate' ? (
          <>
            <p>
              We appreciate the opportunity to support your facility. Our team
              is committed to reliable service, clear communication, and
              measurable results.
            </p>
            <p className="font-bold italic ">
              We look forward to serving your Cleaning needs with the highest
              standards of care
            </p>
          </>
        ) : (
          <p className="leading-[41px]">
            We appreciate the opportunity to support your facility. Our team is
            committed to reliable service, clear communication, and measurable
            results.
          </p>
        )}
        <div className={`flex items-center gap-2 ${fontWeight} ${fontFamily}`}>
          <EmailIcon className="size-6 text-[var(--color-primary)]" />
          <span>Email [{email}]</span>
        </div>
        <div className={`flex items-center gap-2 ${fontWeight} ${fontFamily}`}>
          <PhoneIcon className="size-6 text-[var(--color-primary)]" />
          <span>Phone: [{phone}]</span>
        </div>
        <div className={`flex items-center gap-2 ${fontWeight} ${fontFamily}`}>
          <WebTrafficIcon className="size-6 text-[var(--color-primary)]" />
          <span>Website [{website}]</span>
        </div>
      </div>
    </>
  );
};

export default ThankYouSection;
