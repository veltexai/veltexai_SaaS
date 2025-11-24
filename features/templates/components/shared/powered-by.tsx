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
    ? 'right-7'
    : isCenter
    ? 'left-[50%] translate-x-[-50%]'
    : 'left-7';

  return (
    <div className={`absolute bottom-2.5 right-5 ${position} ${className}`}>
      <Image
        src={srlUrl}
        alt="Veltex AI Logo"
        className="!w-[120px] h-12 mx-auto"
        height={46}
        width={200}
      />
    </div>
  );
};

export default PoweredBy;
