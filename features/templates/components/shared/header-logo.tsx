import { TemplateType } from '@/features/templates/types/templates';
import Image from 'next/image';
import React from 'react';

const HeaderLogo = ({
  logoUrl,
  companyName,
  isTop,
  withoutGradient,
  position,
  template,
}: {
  logoUrl: string;
  companyName: string;
  isTop?: boolean;
  withoutGradient?: boolean;
  position?: 'start' | 'center' | 'end';
  template?: TemplateType;
}) => {
  return (
    <div
      className={`z-30 flex items-center justify-${
        position || 'center'
      } absolute px-2 sm:px-3 py-1 sm:py-2 ${
        withoutGradient
          ? ''
          : 'bg-gradient-to-r from-[#ffffff64] to-[#e3f2ff52] rounded-full sm:h-28 sm:w-80 h-10 w-40'
      } ${
        isTop
          ? 'top-5 sm:top-10 left-3 sm:left-12'
          : 'top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]'
      }`}
    >
      {template === 'luxury_elite' && (
        <div className="absolute bg-white w-full h-[80px] sm:h-[100px] md:h-[129.16px] -z-10"></div>
      )}

      <Image
        src={logoUrl}
        alt={companyName}
        className="h-3 sm:h-6 w-auto object-contain max-w-full"
        height={48}
        width={144}
        priority
        unoptimized
      />
    </div>
  );
};

export default HeaderLogo;
