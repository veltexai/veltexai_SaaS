import { cn } from '@/lib/utils';
import React from 'react';

type HorizontalBarProps = {
  className?: string;
  variant?: 'gradientWhite' | 'gradientGray' | 'normal';
};

const VARIANTS: Record<NonNullable<HorizontalBarProps['variant']>, string> = {
  gradientWhite: 'bg-gradient-to-b from-white/10 to-white',
  gradientGray: 'bg-gradient-to-b from-[#F3F3F3] to-[#CECECE]',
  normal: 'bg-[#00000036]',
};

export default function HorizontalBar({
  className,
  variant = 'gradientWhite',
}: HorizontalBarProps) {
  return (
    <div
      className={cn(
        'z-30 absolute left-0 h-[2px] w-full',
        VARIANTS[variant],
        className
      )}
      aria-hidden
    />
  );
}
