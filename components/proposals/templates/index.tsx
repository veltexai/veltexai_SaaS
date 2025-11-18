'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  TemplateProps,
  TemplateType,
  Proposal,
  ProposalTemplateRow,
} from '@/types/templates';
import { BasicTemplate } from './basic';
import { ExecutivePremiumTemplate } from './executive-premium';
import { ModernCorporateTemplate } from './modern-corporate';
import { LuxuryEliteTemplate } from './luxury-elite';

const COMPONENTS: Record<TemplateType, React.FC<TemplateProps>> = {
  basic: BasicTemplate,
  executive_premium: ExecutivePremiumTemplate,
  modern_corporate: ModernCorporateTemplate,
  luxury_elite: LuxuryEliteTemplate,
};

function detectType(t?: ProposalTemplateRow | null): TemplateType {
  // Prefer `template_type`; fallback to normalized `display_name`
  // Prefer name for style detection; template_type is tier ('basic'|'premium')
  const name = t?.name?.toLowerCase() ?? '';
  if (name.includes('executive') || name.includes('premium'))
    return 'executive_premium';
  if (name.includes('modern') || name.includes('corporate'))
    return 'modern_corporate';
  if (name.includes('luxury') || name.includes('elite')) return 'luxury_elite';
  // Fallback by tier if name is not informative
  if (t?.template_type === 'basic') return 'basic';
  return 'executive_premium';
}

export function TemplateRenderer({ proposal }: { proposal: Proposal }) {
  const [templateRow, setTemplateRow] = useState<ProposalTemplateRow | null>(
    null
  );
  console.log('🚀 ~ TemplateRenderer ~ templateRow:', templateRow);
  const [branding, setBranding] = useState<
    | {
        name?: string;
        logo_url?: string | null;
        phone?: string | null;
        website?: string | null;
        email?: string | null;
      }
    | undefined
  >(undefined);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function loadTemplate() {
      setLoading(true);
      setErr(null);

      try {
        const templatePromise = (async (): Promise<{
          data: ProposalTemplateRow | null;
          error: any;
        }> => {
          if (!proposal.template_id) return { data: null, error: null };
          const res = await supabase
            .from('proposal_templates')
            .select('*')
            .eq('id', proposal.template_id)
            .single();
          return {
            data: (res.data as ProposalTemplateRow) ?? null,
            error: res.error,
          };
        })();

        const profilePromise = supabase
          .from('profiles')
          .select('company_name, full_name, logo_url, phone, website, email')
          .eq('id', proposal.user_id)
          .single();

        const [
          { data: templateData, error: templateError },
          { data: profileData, error: profileError },
        ] = await Promise.all([templatePromise, profilePromise]);

        if (templateError) throw templateError;
        if (profileError) {
          // Don't hard fail on branding fetch; continue without branding
          console.warn(
            'Branding fetch failed:',
            profileError?.message ?? profileError
          );
        }

        if (mounted) {
          setTemplateRow(templateData ?? null);
          const name =
            (profileData?.company_name as string | undefined) ??
            (profileData?.full_name as string | undefined);
          setBranding({
            name,
            logo_url: profileData?.logo_url ?? null,
            phone: profileData?.phone ?? null,
            website: profileData?.website ?? null,
            email: profileData?.email ?? null,
          });
        }
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? 'Failed to load template');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTemplate();
    return () => {
      mounted = false;
    };
  }, [proposal.template_id]);

  const type = useMemo(() => detectType(templateRow), [templateRow]);
  const Component = COMPONENTS[type] ?? BasicTemplate;
  console.log('🚀 ~ TemplateRenderer ~ Component:', Component);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading template…</div>
    );
  }
  if (err) {
    return (
      <div className="text-sm text-red-600">
        Failed to load template. Using Basic. ({err})
      </div>
    );
  }

  return (
    <Component proposal={proposal} template={templateRow} branding={branding} />
  );
}

export { BasicTemplate } from './basic';
export { ExecutivePremiumTemplate } from './executive-premium';
export { ModernCorporateTemplate } from './modern-corporate';
export { LuxuryEliteTemplate } from './luxury-elite';
export type { TemplateProps, TemplateType } from '@/types/templates';
