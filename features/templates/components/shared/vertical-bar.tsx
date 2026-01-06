import React from 'react';

import { cn } from '@/lib/utils';

type VerticalBarProps = {
  className?: string;
  variant?: 'gradientWhite' | 'gradientGray' | 'normal' | 'white';
};

const VARIANTS: Record<NonNullable<VerticalBarProps['variant']>, string> = {
  gradientWhite: 'bg-gradient-to-b from-white/10 to-white',
  gradientGray: 'bg-gradient-to-b from-[#F3F3F3] to-[#CECECE]',
  normal: 'bg-[#00000036]',
  white: 'bg-white',
};

export default function VerticalBar({
  className,
  variant = 'gradientWhite',
}: VerticalBarProps) {
  return (
    <div
      className={cn(
        'z-20 absolute top-0 h-full w-[1px] sm:w-[2px]',
        VARIANTS[variant],
        className
      )}
      aria-hidden
    />
  );
}
