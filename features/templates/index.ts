export type {
  TemplateProps,
  TemplateType,
  Proposal,
  ProposalTemplateRow,
} from './types/templates';

export {
  BasicTemplate,
  ExecutivePremiumTemplate,
  ModernCorporateTemplate,
  LuxuryEliteTemplate,
} from './components';

export { TemplateRenderer } from './template-renderer';

export {
  parseScopeTableData,
  splitScopeRows,
  type ScopeRow,
} from './utils/split-scope-rows';