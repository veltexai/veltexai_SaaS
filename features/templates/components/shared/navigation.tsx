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
  const fontSize = size === 'sm' 
    ? 'text-[16px] sm:text-[20px] md:text-[24px]' 
    : 'text-[16px] sm:text-[38px] md:text-[50px]';
  const fontFamilyClass =
    fontFamily === 'montserrat'
      ? `${montserrat.className}`
      : fontFamily === 'dmSerifText'
      ? `${dmSerifText.className}`
      : 'tk-bely-display font-black';

  const fontClass = font === 'bold' ? 'font-bold' : 'font-normal';
  const positionClass =
    position === 'bottom-left-corner' 
      ? 'left-3 sm:left-1.5 md:left-2 bottom-0.5 sm:bottom-1' 
      : 'top-1 sm:top-1.5 md:top-2 right-2 sm:right-3 md:right-4';
  return (
    <div
      className={`text-[var(--color-primary)] absolute ${positionClass} ${fontClass} ${fontSize} ${fontFamilyClass}`}
    >
      0{value}
    </div>
  );
};

export default NavitationNumber;
