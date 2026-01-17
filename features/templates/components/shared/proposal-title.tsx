import React from 'react';
import { TemplateType } from '@/features/templates/types/templates';
import { dmSerifText, montserrat } from '@/lib/fonts';
import { splitTitleWithAmpersand } from '@/features/templates/utils/utils';
import { cn } from '@/lib/utils';

type ProposalTitleProps = {
  templateType: TemplateType;
  title: string;
  className?: string;
};

export default function ProposalTitle({
  templateType,
  title,
  className,
}: ProposalTitleProps) {
  const { first, second } = splitTitleWithAmpersand(title, templateType);
  if (templateType === 'basic') {
    return (
      <h1
        className={cn(
          `${dmSerifText.className} text-4xl font-bold text-[var(--color-primary)]`,
          className
        )}
      >
        {title}
      </h1>
    );
  }

  if (templateType === 'modern_corporate') {
    return (
      <div className={cn('flex items-center gap-3 relative', className)}>
        <span
          aria-hidden
          className="z-20 absolute sm:-left-[40.2px] -left-[39px] sm:h-20 h-15 sm:w-10 w-8 bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary)_20%,#4a67d4_50%,#3555C7_100%)]"
        />
        <h1
          className={`${montserrat.className} font-bold text-[var(--color-primary)] sm:pl-5 pl-2`}
        >
          {first ? (
            <span className="font-normal block sm:text-3xl text-xl">{first} </span>
          ) : null}
          <span className="font-bold sm:text-5xl text-2xl">{second}</span>
        </h1>
      </div>
    );
  }

  if (templateType === 'executive_premium') {
    return (
      <div className={cn('relative inline-block', className)}>
        <h1
          className={`${montserrat.className} text-2xl sm:text-5xl text-[var(--color-primary)]`}
        >
          {first ? <span className="font-normal">{first} </span> : null}
          <span className="font-bold">{second}</span>
        </h1>
        {/* <span
          aria-hidden
          className="absolute left-0 right-0 -bottom-2 h-[2px] bg-gradient-to-r from-[var(--color-primary)] to-[#3b82f6]"
        /> */}
      </div>
    );
  }

  if (templateType === 'luxury_elite') {
    return (
      <div
        className={cn(
          'relative z-20 inline-block',
          className,
          `${
            first.toLowerCase() === 'about our'
              ? 'absolute sm:-top-50 -top-[90px] right-0'
              : ''
          }`
        )}
      >
        <h1
          className={`tk-bely relative z-20 font-bold text-[var(--color-primary)] sm:mt-7 mt-0`}
        >
          {first ? (
            <span
              className={`font-normal block sm:text-4xl text-xl ${
                first.toLowerCase() === 'about our' ? 'text-right' : ''
              } `}
            >
              {first}{' '}
            </span>
          ) : null}
          <span className="font-bold sm:text-7xl text-3xl leading-[50%]">{second}</span>
        </h1>
      </div>
    );
  }

  return (
    <h1
      className={cn(
        `${dmSerifText.className} text-4xl font-bold text-[var(--color-primary)]`,
        className
      )}
    >
      {title}
    </h1>
  );
}
