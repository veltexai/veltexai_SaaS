import { CatalogDocument } from '@/features/service-catalog/components/catalog-document';
import { isCatalogProposal } from '@/features/service-catalog/proposal';
import { PrintTemplateSwitcher } from '@/features/templates/components/print-template-switcher';

interface CanonicalPrintDocumentProps {
  proposal: any;
  branding?: any;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  pages?: string[];
  extrasRows?: any[];
  showPoweredBy?: boolean;
}

export function CanonicalPrintDocument({
  proposal,
  branding,
  colors,
  pages,
  extrasRows,
  showPoweredBy,
}: CanonicalPrintDocumentProps) {
  if (isCatalogProposal(proposal)) {
    return (
      <div className="bg-white">
        <style>{`@page { size: A4; margin: 16mm; } html, body { margin: 0; }`}</style>
        <CatalogDocument
          content={proposal.generated_content ?? ''}
          companyName={branding?.name}
          branding={branding}
          showPoweredBy={showPoweredBy}
        />
      </div>
    );
  }

  return (
    <div className="bg-white print-root">
      <style>{`
        @page { size: A4; margin: 0; }
        html, body, .print-root { width: 210mm; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print { .no-print { display: none !important; } }
        [id^="page-"] { width: 210mm !important; height: 296mm !important; box-sizing: border-box; break-inside: avoid; page-break-after: auto; overflow: hidden; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #page-five { page-break-after: auto; }
        .text-5xl { font-size: 54px !important; line-height: 1.15 !important; }
        .proposal-title { font-size: 44px !important; line-height: 1.04 !important; overflow-wrap: normal !important; word-break: normal !important; hyphens: none !important; }
        .print-root > section { margin-top: 0 !important; margin-bottom: 0 !important; }
        .print-root > section > [id^="page-"] { margin-top: 0 !important; margin-bottom: 0 !important; }
        [id^="page-"] * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        :root { --color-primary: ${colors.primary}; --color-secondary: ${colors.secondary}; --color-accent: ${colors.accent}; }
      `}</style>
      <PrintTemplateSwitcher
        proposal={proposal}
        branding={branding}
        pages={pages}
        print
        extrasRows={extrasRows}
        showPoweredBy={showPoweredBy}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){function check(){var el=document.querySelector('[data-extras-ready="true"]'); if(el){ window.__EXTRAS_READY__=true; } else { setTimeout(check,100);} } check();})();`,
        }}
      />
    </div>
  );
}
