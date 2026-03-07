// Types
export type {
  TemplateProps,
  TemplateType,
  Proposal,
  ProposalTemplateRow,
} from './types/templates';

// Template variants
export {
  BasicTemplate,
  ExecutivePremiumTemplate,
  ModernCorporateTemplate,
  LuxuryEliteTemplate,
} from './components';

// Template UI
export { default as TemplatePreviewDialog } from './components/template-preview-dialog';
export { TemplatePreview } from './components/template-preview';
export { TemplateSelector } from './components/template-selector';

export { TemplateRenderer } from './template-renderer';

// Utils
export {
  parseScopeTableData,
  splitScopeRows,
  type ScopeRow,
} from './utils/split-scope-rows';