import { dmSerifText } from '@/lib/fonts';
import Image from 'next/image';
import React from 'react';

const PoweredBy = ({
  colorLogo,
  isRight,
  isCenter,
  sizeImage = 'medium',
  className = '',
  template = '',
}: {
  colorLogo: string;
  isRight?: boolean;
  isCenter?: boolean;
  sizeImage?: 'small' | 'medium' | 'large';
  className?: string;
  template?: string;
}) => {
  const srlUrl = `/images/templates/veltexAiLogo_${colorLogo}.svg`;
  const position = isRight
    ? 'right-7'
    : isCenter
    ? 'left-[50%] translate-x-[-50%]'
    : 'left-7';
  const colorText = colorLogo === 'white' ? 'text-white' : 'text-[#7F7F7F]';

  if (template === 'modern_corporate') {
    return (
      <div className="absolute bottom-2.5 w-full">
        <Image
          src="/images/templates/logoFooter.svg"
          alt="Veltex AI Logo"
          className="!w-[120px] h-12 mx-auto"
          height={46}
          width={200}
        />
      </div>
    );
  }

  if (template === 'luxury_elite') {
    return (
      <div className="absolute bottom-2.5 right-5">
        <Image
          src="/images/templates/logofooter-gray.svg"
          alt="Veltex AI Logo"
          className="!w-[120px] h-12 mx-auto"
          height={46}
          width={200}
        />
      </div>
    );
  }

  return (
    <div
      className={`absolute ${className} bottom-5 ${position} flex items-center gap-2.5 ${colorText}`}
    >
      <p
        className={`${dmSerifText.className} ${
          sizeImage === 'small' ? 'text-sm' : 'text-base'
        }`}
      >
        Powered By
      </p>
      <Image
        src={srlUrl}
        alt="Veltex AI Logo"
        className={`w-32 h-auto ${sizeImage === 'small' ? 'w-auto h-4' : ''}`}
        height={sizeImage === 'small' ? 38 : 64}
        width={sizeImage === 'small' ? 86 : 128}
      />
    </div>
  );
};

export default PoweredBy;
