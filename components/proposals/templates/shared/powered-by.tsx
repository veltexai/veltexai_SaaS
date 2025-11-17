import Image from 'next/image';
import React from 'react';

const PoweredBy = ({
  colorLogo,
  isRight,
  isCenter,
}: {
  colorLogo: string;
  isRight?: boolean;
  isCenter?: boolean;
}) => {
  const srlUrl = `/images/templates/veltexAiLogo_${colorLogo}.svg`;
  const position = isRight
    ? 'right-7'
    : isCenter
    ? 'left-[50%] translate-x-[-50%]'
    : 'left-7';
  const colorText = colorLogo === 'white' ? 'text-white' : 'text-[#7F7F7F]';
  return (
    <div
      className={`absolute bottom-5 ${position} flex items-center gap-2.5 ${colorText}`}
    >
      <p>Powered By</p>
      <Image
        src={srlUrl}
        alt="Veltex AI Logo"
        className="w-32 h-auto"
        height={64}
        width={128}
      />
    </div>
  );
};

export default PoweredBy;
