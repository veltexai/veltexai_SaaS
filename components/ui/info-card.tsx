'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface InfoCardProps {
  title: string;
  description?: string;
  imageSrc: string;
  imageAlt: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function InfoCard({
  title,
  description,
  imageSrc,
  imageAlt,
  isSelected = false,
  onClick,
  className,
}: InfoCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-lg',
          isSelected
            ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
            : 'border-gray-200 hover:border-gray-300 hover:scale-105',
          className
        )}
        onClick={onClick}
        onMouseEnter={() => description && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-40 h-40 flex items-center justify-center">
              <Image
                width={300}
                height={300}
                src={imageSrc}
                alt={imageAlt}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
                {title}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tooltip */}
      {description && showTooltip && (
        <div className="absolute z-50 top-2 left-0 ml-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-95 pointer-events-none">
          <div className="relative">
            {description}
            {/* Arrow */}
            <div className="absolute top-3 -left-2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}
