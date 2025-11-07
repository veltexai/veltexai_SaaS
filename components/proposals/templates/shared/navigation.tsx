"use client";
import { dmSerifText, montserrat } from '@/lib/fonts';
import React from 'react';
import { useUserBranding } from '@/hooks/use-user-branding';

const NavitationNumber = ({
  value,
  size,
  fontFamily,
  font,
}: {
  value: number;
  size: 'sm' | 'lg';
  fontFamily: 'montserrat' | 'dmSerifText';
  font: 'bold' | 'normal';
}) => {
  // Load branding to ensure CSS variables are applied
  // This sets --color-primary for use in className below
  const { settings } = useUserBranding();
  const fontSize = size === 'sm' ? 'text-[35px]' : 'text-[50px]';
  const fontFamilyClass =
    fontFamily === 'montserrat'
      ? `${montserrat.className}`
      : `${dmSerifText.className}`;
  const fontClass = font === 'bold' ? 'font-bold' : 'font-normal';
  return (
    <div
      className={`text-[var(--color-primary)] absolute left-2 bottom-1 ${fontClass} ${fontSize} ${fontFamilyClass}`}
    >
      0{value}
    </div>
  );
};

export default NavitationNumber;
