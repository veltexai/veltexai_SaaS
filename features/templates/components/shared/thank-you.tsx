import { TemplateType } from '@/features/templates/types/templates';
import Image from 'next/image';
import React from 'react';
import ThankYouSection from '../sections/thank-you-section';

const ThankYouPage = ({
  email,
  phone,
  website,
  logoUrl,
  companyName,
  templateType,
}: {
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  companyName: string;
  templateType: TemplateType;
}) => {
  const SrcImage =
    templateType === 'modern_corporate'
      ? '/images/templates/images/image17-1.png'
      : templateType === 'luxury_elite'
      ? '/images/templates/images/Mask group-4.png'
      : '/images/templates/images/image17.png';

  return (
    <>
      <div
        className={`${
          templateType === 'luxury_elite'
            ? 'absolute right-0 bottom-0 h-[75%] w-full'
            : 'relative w-[85%] h-[55%] top-12 left-1/2 -translate-x-1/2'
        }`}
      >
        <Image
          src={SrcImage}
          alt="Background"
          className={`size-full ${
            templateType === 'luxury_elite' ? 'object-fill' : 'object-cover'
          }`}
          height={1600}
          width={1000}
        />
      </div>
      <div
        className={`absolute flex items-start justify-center ${
          templateType === 'luxury_elite'
            ? 'flex-col gap-6 left-0 top-0 w-[60%] pl-8 pt-8'
            : 'w-[90%] bottom-12 left-1/2 -translate-x-1/2 '
        }`}
      >
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={companyName}
            className={`${
              templateType === 'luxury_elite'
                ? 'max-h-[60px] w-auto mb-3'
                : 'h-12 w-auto flex-[80%] object-contain'
            }`}
            height={48}
            width={144}
          />
        ) : null}
        <ThankYouSection
          templateType={templateType}
          email={email}
          phone={phone}
          website={website}
        />
      </div>
    </>
  );
};

export default ThankYouPage;
