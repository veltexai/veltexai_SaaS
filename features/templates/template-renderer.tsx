import { detectTemplateType } from './utils/utils';
import { loadTemplateData } from './services/template-service';
import type {
  TemplateProps,
  TemplateType,
  Proposal,
  ProposalTemplateRow,
} from './types/templates';
import {
  BasicTemplate,
  ExecutivePremiumTemplate,
  ModernCorporateTemplate,
  LuxuryEliteTemplate,
} from './components';

const COMPONENTS: Record<TemplateType, React.FC<TemplateProps>> = {
  basic: BasicTemplate,
  executive_premium: ExecutivePremiumTemplate,
  modern_corporate: ModernCorporateTemplate,
  luxury_elite: LuxuryEliteTemplate,
};

export async function TemplateRenderer({ proposal }: { proposal: Proposal }) {
  try {
    const { templateRow, branding } = await loadTemplateData(proposal);
    const type = detectTemplateType(templateRow);
    const Component = COMPONENTS[type] ?? BasicTemplate;
    return (
      <div className="w-full overflow-x-auto">
        <div className="min-w-[320px]">
          <Component proposal={proposal} template={templateRow} branding={branding} />
        </div>
      </div>
    );
  } catch (e: any) {
    return (
      <div className="text-xs sm:text-sm text-red-600 p-3 sm:p-4 bg-red-50 rounded-md">
        <p className="font-medium">Failed to load template</p>
        <p className="mt-1 text-red-500">Using Basic template. ({e?.message ?? 'Unknown error'})</p>
      </div>
    );
  }
}

export { BasicTemplate } from './components/basic';
export { ExecutivePremiumTemplate } from './components/executive-premium';
export { ModernCorporateTemplate } from './components/modern-corporate';
export { LuxuryEliteTemplate } from './components/luxury-elite';
export type { TemplateProps, TemplateType } from './types/templates';
