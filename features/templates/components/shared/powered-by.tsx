import Image from 'next/image';
import React from 'react';
import { TemplateType } from '../../template-renderer';

const PoweredBy = ({
  colorLogo,
  isRight,
  isCenter,
  className = '',
  template,
}: {
  colorLogo: string;
  isRight?: boolean;
  isCenter?: boolean;
  className?: string;
  template?: TemplateType;
}) => {
  const srlUrl = `/images/templates/logofooter-${colorLogo}.svg`;
  const position = isRight
    ? 'right-3 sm:right-5 md:right-7'
    : isCenter
    ? 'left-[50%] translate-x-[-50%]'
    : 'left-3 sm:left-5 md:left-7';

  return (
    <div className={`absolute -bottom-1 sm:bottom-2 md:bottom-2.5 ${position} ${className}`}>
      <Image
        src={srlUrl}
        alt="Veltex AI Logo"
        className="!w-[80px] sm:!w-[100px] md:!w-[120px] h-8 sm:h-10 md:h-12 mx-auto"
        height={46}
        width={200}
        priority
        unoptimized
      />
    </div>
  );
};

export default PoweredBy;
