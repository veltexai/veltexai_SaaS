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
    <div className="pl-14 pt-14 pr-6 flex flex-col gap-6">
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
            <h2 className={`text-lg font-bold ${fontFamilyTitle}`}>
              {term.title}
            </h2>
            <p className={`mt-2 text-xs ${fontFamilyDescription}`}>
              {term.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TitleDescriptionSection;
