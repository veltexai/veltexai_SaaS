import React from 'react';
import { TemplateType } from '@/types/templates';
import { dmSerifText, montserrat } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { LuxuryEliteBackgroundTitle } from '@/components/icons';

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
          className="z-20 absolute -left-[40.2px] h-20 w-10 bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary)_20%,#4a67d4_50%,#3555C7_100%)]"
        />
        <h1
          className={`${montserrat.className} font-bold text-[var(--color-primary)] pl-5`}
        >
          {(() => {
            const parts = title.trim().split(/\s+/);
            const first = parts.slice(0, -1).join(' ');
            const second = parts.slice(-1)[0] ?? '';
            return (
              <>
                {first ? (
                  <span className="font-normal block text-3xl">{first} </span>
                ) : null}
                <span className="font-bold text-5xl">{second}</span>
              </>
            );
          })()}
        </h1>
      </div>
    );
  }

  if (templateType === 'executive_premium') {
    return (
      <div className={cn('relative inline-block', className)}>
        <h1
          className={`${montserrat.className} text-5xl text-[var(--color-primary)]`}
        >
          {(() => {
            const parts = title.trim().split(/\s+/);
            const first = parts.slice(0, -1).join(' ');
            const second = parts.slice(-1)[0] ?? '';
            return (
              <>
                {first ? <span className="font-normal">{first} </span> : null}
                <span className="font-bold">{second}</span>
              </>
            );
          })()}
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
      <div className={cn('relative z-20 inline-block', className)}>
        <h1
          className={`tk-bely relative z-20 font-bold text-[var(--color-primary)] mt-7`}
        >
          {(() => {
            const parts = title.trim().split(/\s+/);
            const first = parts.slice(0, -1).join(' ');
            const second = parts.slice(-1)[0] ?? '';
            return (
              <>
                {first ? (
                  <span className="font-normal block text-4xl">{first} </span>
                ) : null}
                <span className="font-bold text-6xl leading-[50%]">
                  {second}
                </span>
              </>
            );
          })()}
        </h1>
        <LuxuryEliteBackgroundTitle className="z-10 absolute -top-[63px] -left-[79px] w-[353px] h-[350px]" />
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
