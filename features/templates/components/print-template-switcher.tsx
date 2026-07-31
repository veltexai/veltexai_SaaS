import {
  BasicTemplate,
  ExecutivePremiumTemplate,
  LuxuryEliteTemplate,
  ModernCorporateTemplate,
} from '.';
import { TemplateProps as PrintTemplateProps } from '../types/templates';
import { PoweredByProvider } from './shared/powered-by-context';

export function PrintTemplateSwitcher({
  proposal,
  branding,
  showPoweredBy,
  ...rest
}: PrintTemplateProps) {
  const template =
    proposal?.template?.name.trim().replace(/\s+/g, '_').toLowerCase() ??
    'basic';

  const renderTemplate = () => {
    switch (template) {
      case 'basic_professional':
        return (
          <BasicTemplate proposal={proposal} branding={branding} {...rest} />
        );
      case 'executive_premium':
        return (
          <ExecutivePremiumTemplate
            proposal={proposal}
            branding={branding}
            {...rest}
          />
        );
      case 'luxury_elite':
        return (
          <LuxuryEliteTemplate
            proposal={proposal}
            branding={branding}
            {...rest}
          />
        );
      case 'modern_corporate':
        return (
          <ModernCorporateTemplate
            proposal={proposal}
            branding={branding}
            {...rest}
          />
        );
      default:
        return (
          <BasicTemplate proposal={proposal} branding={branding} {...rest} />
        );
    }
  };

  return (
    <PoweredByProvider show={showPoweredBy ?? true}>
      {renderTemplate()}
    </PoweredByProvider>
  );
}
