import Image from 'next/image';
import React from 'react';

const HeaderLogo = ({
  logoUrl,
  companyName,
  isTop,
  withoutGradient,
  position,
}: {
  logoUrl: string;
  companyName: string;
  isTop?: boolean;
  withoutGradient?: boolean;
  position?: 'start' | 'center' | 'end';
}) => {
  return (
    <div
      className={`z-30 w-[206px] h-[70px] flex items-center justify-${
        position || 'center'
      } absolute px-3 py-2 ${
        withoutGradient
          ? 'bg-[#ffffff64]'
          : 'bg-gradient-to-r from-[#ffffff64] to-[#e3f2ff52] rounded-full'
      } ${
        isTop
          ? 'top-6 left-7'
          : 'top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]'
      }`}
    >
      <Image
        src={logoUrl}
        alt={companyName}
        className="h-12 w-auto"
        height={48}
        width={144}
        //   sizes="(max-width: 768px) 96px, 144px"
        priority
        unoptimized
      />
    </div>
  );
};

export default HeaderLogo;
