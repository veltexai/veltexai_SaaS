import { dmSerifText, montserrat } from '@/lib/fonts';
import React from 'react';

const NavitationNumber = ({
  value,
  size,
  fontFamily,
  font,
  position,
}: {
  value: number;
  size: 'sm' | 'lg';
  fontFamily: 'montserrat' | 'dmSerifText' | 'bely';
  font: 'bold' | 'normal';
  position: 'bottom-left-corner' | 'top-right-corner';
}) => {
  const fontSize = size === 'sm' ? 'text-[24px]' : 'text-[50px]';
  const fontFamilyClass =
    fontFamily === 'montserrat'
      ? `${montserrat.className}`
      : fontFamily === 'dmSerifText'
      ? `${dmSerifText.className}`
      : 'tk-bely-display font-black';

  const fontClass = font === 'bold' ? 'font-bold' : 'font-normal';
  const positionClass =
    position === 'bottom-left-corner' ? 'left-2 bottom-1' : 'top-2 right-4';
  return (
    <div
      className={`text-[var(--color-primary)] absolute ${positionClass} ${fontClass} ${fontSize} ${fontFamilyClass}`}
    >
      0{value}
    </div>
  );
};

export default NavitationNumber;
