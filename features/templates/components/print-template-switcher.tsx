import {
  BasicTemplate,
  ExecutivePremiumTemplate,
  LuxuryEliteTemplate,
  ModernCorporateTemplate,
} from '.';
import {
  TemplateProps as PrintTemplateProps,
  TemplateType,
} from '../types/templates';
import { resolveTemplateImages } from '../utils/resolve-template-images';
import { PoweredByProvider } from './shared/powered-by-context';

/**
 * The print path keys off the raw template name rather than detectTemplateType,
 * so map those same keys onto a TemplateType for image resolution only. Which
 * component renders is unchanged.
 */
const TEMPLATE_TYPE_BY_NAME: Record<string, TemplateType> = {
  basic_professional: 'basic',
  executive_premium: 'executive_premium',
  luxury_elite: 'luxury_elite',
  modern_corporate: 'modern_corporate',
};

export function PrintTemplateSwitcher({
  proposal,
  branding,
  showPoweredBy,
  ...rest
}: PrintTemplateProps) {
  const template =
    proposal?.template?.name.trim().replace(/\s+/g, '_').toLowerCase() ??
    'basic';

  const images = resolveTemplateImages(
    proposal,
    TEMPLATE_TYPE_BY_NAME[template] ?? 'basic'
  );

  const renderTemplate = () => {
    switch (template) {
      case 'basic_professional':
        return (
          <BasicTemplate
            proposal={proposal}
            branding={branding}
            images={images}
            {...rest}
          />
        );
      case 'executive_premium':
        return (
          <ExecutivePremiumTemplate
            proposal={proposal}
            branding={branding}
            images={images}
            {...rest}
          />
        );
      case 'luxury_elite':
        return (
          <LuxuryEliteTemplate
            proposal={proposal}
            branding={branding}
            images={images}
            {...rest}
          />
        );
      case 'modern_corporate':
        return (
          <ModernCorporateTemplate
            proposal={proposal}
            branding={branding}
            images={images}
            {...rest}
          />
        );
      default:
        return (
          <BasicTemplate
            proposal={proposal}
            branding={branding}
            images={images}
            {...rest}
          />
        );
    }
  };

  return (
    <PoweredByProvider show={showPoweredBy ?? true}>
      {renderTemplate()}
    </PoweredByProvider>
  );
}
