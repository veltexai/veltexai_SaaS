'use client';

import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

type TemplateKind = 'modern' | 'classic' | 'minimal' | 'professional';

interface ProposalAcceptanceProps {
  template: TemplateKind;
  clientName?: string;
  companyName?: string;
  onAccept?: () => void;
  className?: string;
}

const containerVariants = cva('relative w-full p-6 sm:p-8', {
  variants: {
    template: {
      modern:
        'rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-background shadow-sm',
      classic: 'rounded-lg border border-muted bg-background shadow-none',
      minimal: 'rounded-md border border-border/60 bg-muted/20',
      professional: 'rounded-xl border bg-card shadow-lg',
    },
  },
  defaultVariants: { template: 'professional' },
});

const headingVariants = cva(
  'text-xl sm:text-2xl font-semibold tracking-tight',
  {
    variants: {
      template: {
        modern: 'text-primary',
        classic: 'font-serif text-foreground',
        minimal: 'text-[#383838] font-medium',
        professional: 'text-foreground',
      },
    },
    defaultVariants: { template: 'professional' },
  }
);

const accentBarVariants = cva('h-1 w-16 rounded-full', {
  variants: {
    template: {
      modern: 'bg-primary',
      classic: 'bg-muted',
      minimal: 'bg-border',
      professional: 'bg-primary/70',
    },
  },
});

export function ProposalAcceptance({
  template,
  clientName,
  companyName,
  onAccept,
  className,
}: ProposalAcceptanceProps) {
  if (template === 'minimal') {
    return (
      <section
        className={cn(
          'w-full py-6 sm:py-8 max-w-[85%] text-[#383838]',
          className
        )}
        aria-label="Proposal Acceptance"
      >
        <div className="space-y-5">
          <div className="grid gap-12">
            <div className="grid grid-cols-[80px_1fr] items-end gap-3">
              <span className="text-sm text-[#383838] font-bold">
                Customer:
              </span>
              <div className="h-px bg-border max-w-[80%]" />
            </div>
            <div className="grid grid-cols-[80px_1fr] items-center gap-3">
              <span className="text-sm text-[#383838] font-bold">
                Contractor:
              </span>
              <div className="h-px bg-border max-w-[80%]" />
            </div>
            <div className="grid grid-cols-[80px_1fr] items-center gap-3">
              <span className="text-sm text-[#383838] font-bold">Date:</span>
              <div className="h-px bg-border max-w-[80%]" />
            </div>
          </div>
          {/* Optional: acceptance button minimal style */}
          {onAccept && (
            <div className="pt-2">
              <Button size="sm" variant="outline" onClick={onAccept}>
                Accept
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-[#383838] mt-24">
          <span className="font-bold">Note:</span> Verbal authorization by
          customer to commence work, including issue of service date
        </p>
      </section>
    );
  }

  const isClassic = template === 'classic';
  const isModern = template === 'modern';
  const isProfessional = template === 'professional';
  console.log("🚀 ~ ProposalAcceptance ~ isProfessional:", isProfessional)

  function SignatureFields({ label }: { label: string }) {
    return (
      <div className={cn('space-y-3')}>
        <label className={cn('text-sm font-medium text-[#383838]')}>
          {label}
        </label>
        <div
          className={cn(
            'h-12 rounded-md',
            isModern && 'border-2 border-primary/40',
            isClassic && 'border border-muted',
            isProfessional && 'border border-border bg-background'
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-[#383838]">Name</span>
            <div
              className={cn(
                'h-10 rounded-md',
                isModern && 'border border-primary/30',
                isClassic && 'border border-muted',
                isProfessional && 'border'
              )}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-[#383838]">Date</span>
            <div
              className={cn(
                'h-10 rounded-md',
                isModern && 'border border-primary/30',
                isClassic && 'border border-muted',
                isProfessional && 'border'
              )}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(containerVariants({ template }), className)}
      aria-labelledby="proposal-acceptance-title"
    >
      {/* Accent / marker */}
      <div className={cn(accentBarVariants({ template }))} />

      <div className={cn('mt-4 flex items-center justify-between gap-4')}>
        <h2
          id="proposal-acceptance-title"
          className={cn(headingVariants({ template }))}
        >
          Proposal Acceptance
        </h2>
        {/* CTA style differences per template */}
        <Button
          size={'default'}
          variant={isClassic ? 'outline' : 'default'}
          className={cn(isModern && 'rounded-full', isProfessional && '')}
          onClick={onAccept}
        >
          Accept
        </Button>
      </div>

      <p className={cn('mt-3 text-sm sm:text-base text-[#383838]')}>
        By signing below, {clientName || 'the client'} agrees to proceed with
        the services outlined in this proposal and acknowledges the terms and
        responsibilities described herein.
      </p>

      {/* Divider style varies per template */}
      <div className={cn('mt-6')}>
        <Separator
          className={cn(
            isModern && 'bg-primary/40',
            isClassic && 'bg-muted',
            isProfessional && 'bg-border'
          )}
        />
      </div>

      {/* Signature block */}
      <div className={cn('mt-6 grid gap-6 sm:grid-cols-2')}>
        <SignatureFields
          label={`Authorized Signature (${companyName || 'Company'})`}
        />
        <SignatureFields
          label={`Client Signature (${clientName || 'Client'})`}
        />
      </div>

      {/* Footnote */}
      <p
        className={cn(
          'mt-6 text-xs',
          isModern && 'text-primary/70',
          isClassic && 'text-[#383838]',
          isProfessional && 'text-[#383838]'
        )}
      >
        Note: Digital acceptance is valid and binding. Physical signatures
        optional per client preference.
      </p>
    </section>
  );
}
