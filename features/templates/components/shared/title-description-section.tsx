import { arvo, dmSerifText, montserrat } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { dataTerms } from '@/lib/templates/content';
import { TemplateType } from '@/features/templates/types/templates';
import React from 'react';

const TitleDescriptionSection = ({
  templateType,
}: {
  templateType: TemplateType;
}) => {
  const fontFamilyTitle =
    templateType === 'luxury_elite' ? 'tk-bely' : dmSerifText.className;
  const fontFamilyDescription =
    templateType === 'luxury_elite' ? arvo.className : montserrat.className;
  return (
    <div className="sm:pl-14 pl-6 sm:pt-14 pt-6 sm:pr-6 pr-0 flex flex-col sm:gap-6 gap-2">
      {dataTerms.map((term) => (
        <div key={term.id} className="flex items-start gap-4">
          {React.isValidElement(term.icons) &&
            templateType !== 'executive_premium' &&
            React.cloneElement(term.icons as React.ReactElement<any>, {
              className: cn(
                (term.icons as any).props?.className,
                'text-[var(--color-primary)]'
              ),
            })}
          <div className="flex flex-col items-start">
            <h2 className={`sm:text-lg text-base font-bold ${fontFamilyTitle}`}>
              {term.title}
            </h2>
            <p className={`mt-2 sm:text-xs text-[10px] ${fontFamilyDescription}`}>
              {term.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TitleDescriptionSection;
