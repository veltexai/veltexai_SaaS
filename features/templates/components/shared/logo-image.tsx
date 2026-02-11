import Image from 'next/image'
import React from 'react'
import { TemplateType } from '@/features/templates/types/templates';

const LogoImage = ({ logoUrl, companyName, templateType }: { logoUrl: string, companyName: string, templateType?: TemplateType }) => {
  return (
    <div className={`sm:w-40 sm:h-18 w-18 h-6 flex items-start justify-center ${
        templateType === 'luxury_elite'
        ? 'sm:mb-3 mb-0' 
        : 'flex-[80%]'}`}>
        <Image
        src={logoUrl}
        alt={companyName}
        className="object-contain max-h-full max-w-full"
        height={48}
        width={144}
        priority
        unoptimized
      />
    </div>
  )
}

export default LogoImage