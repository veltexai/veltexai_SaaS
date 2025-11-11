'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { TemplateProps, TemplateType } from '@/types/templates';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import PoweredBy from './shared/powered-by';
import VerticalBar from './shared/vertical-bar';
import HorizontalBar from './shared/horizontal-bar';
import HeaderTemplate from './shared/header-template';
import NavitationNumber from './shared/navigation';
import HeaderLogo from './shared/header-logo';
import { montserrat } from '@/lib/fonts';
import ProposalAcceptance from './shared/proposal-acceptance';

export function BasicTemplate({ proposal, branding }: TemplateProps) {
  const logoUrl = branding?.logo_url ?? null;
  const companyName = branding?.name ?? 'Company';
  const preparedFor =
    proposal.client_company || proposal.client_name || 'Client';

  // Map global template types to acceptance UI variants
  const acceptanceVariantMap: Record<
    TemplateType,
    'modern' | 'classic' | 'minimal' | 'professional'
  > = {
    basic: 'minimal',
    modern_corporate: 'modern',
    executive_premium: 'professional',
    luxury_elite: 'classic',
  };
  const acceptanceVariant =
    acceptanceVariantMap[(proposal as any).templateType as TemplateType] ??
    'minimal';

  type SplitResponse = {
    sections: { id: string; title?: string | null; content: string }[];
    pages: string[];
    templateType:
      | 'basic'
      | 'executive_premium'
      | 'modern_corporate'
      | 'luxury_elite';
    error?: string;
  };

  const [split, setSplit] = useState<SplitResponse | null>(null);
  const [loadingSplit, setLoadingSplit] = useState(false);
  const [splitErr, setSplitErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadSplit() {
      if (!proposal?.id) return;
      setLoadingSplit(true);
      setSplitErr(null);
      try {
        const res = await fetch(`/api/proposals/${proposal.id}/split`, {
          cache: 'no-store',
        });
        const data: SplitResponse = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to split');
        if (mounted) setSplit(data);
      } catch (e: any) {
        if (mounted) setSplitErr(e?.message ?? 'Failed to load pages');
      } finally {
        if (mounted) setLoadingSplit(false);
      }
    }
    loadSplit();
    return () => {
      mounted = false;
    };
  }, [proposal.id]);

  return (
    <section className="space-y-6">
      <div id="page-one" className="relative aspect-[1/1.4] bg-white">
        <VerticalBar className="left-20" />
        <HorizontalBar className="bottom-20" />
        <Image
          src="/images/templates/firstBlueBackground.svg"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
          height={1600}
          width={1100}
        />
        {logoUrl ? (
          <HeaderLogo logoUrl={logoUrl} companyName={companyName} isTop />
        ) : null}
        <div className="absolute bottom-50 right-10 max-w-[70%]">
          <HeaderTemplate
            title={proposal.title}
            date={proposal.created_at}
            preparedFor={preparedFor}
            address={proposal.service_location}
          />
        </div>
        <PoweredBy colorLogo="white" isRight />
      </div>

      {/* Pages 2-4: server-split AI content */}
      {loadingSplit && (
        <Card className="rounded-none">
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Loading content…
            </div>
          </CardContent>
        </Card>
      )}
      {splitErr && (
        <Card className="rounded-none">
          <CardContent>
            <div className="text-sm text-red-600">{splitErr}</div>
          </CardContent>
        </Card>
      )}
      {split?.pages?.length
        ? split.pages.map((pageContent, idx) => (
            <div
              key={`page-${idx + 2}`}
              id={`page-${idx + 2}`}
              className="relative aspect-[1/1.4] bg-white p-8"
            >
              <div className="max-w-none pl-[95px]">
                {pageContent?.trim().length ? (
                  <MarkdownRenderer
                    content={pageContent}
                    className={`${montserrat.className}`}
                    showAcceptance={idx === (split.pages?.length ?? 0) - 1}
                    acceptanceTemplate={acceptanceVariant}
                    acceptanceClientName={preparedFor}
                    acceptanceCompanyName={companyName}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No content
                  </div>
                )}
              </div>
              <VerticalBar className="left-20" variant="gradientGray" />
              <HorizontalBar className="bottom-20" variant="gradientGray" />
              <PoweredBy colorLogo="gray" isRight />
              <NavitationNumber
                value={idx + 1}
                size="lg"
                fontFamily="montserrat"
                font="bold"
              />
            </div>
          ))
        : null}

      {/* Fallback block: original content display if pages not available */}
      {!split?.pages?.length && (
        <Card>
          <CardHeader>
            <CardTitle>Proposal Content</CardTitle>
          </CardHeader>
          <CardContent>
            {proposal.generated_content ? (
              <div className="prose max-w-none">
                <MarkdownRenderer content={proposal.generated_content} />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No AI content yet.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div id="page-five" className="relative aspect-[1/1.4]">
        <VerticalBar className="right-20" />
        <HorizontalBar className="top-20" />
        <Image
          src="/images/templates/secondBlueBackground.svg"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
          height={1600}
          width={1100}
        />
        {logoUrl ? (
          <HeaderLogo logoUrl={logoUrl} companyName={companyName} />
        ) : null}
        <PoweredBy colorLogo="white" isCenter />
      </div>
    </section>
  );
}
