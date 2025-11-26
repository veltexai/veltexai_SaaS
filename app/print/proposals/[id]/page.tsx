import { getPrintPageData } from '@/features/templates/services/print-data-service';
import { PrintTemplateSwitcher } from '@/features/templates/components/print-template-switcher';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function PrintProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { proposal, branding, colors, pages, extrasRows } =
    await getPrintPageData(id);

  if (!proposal) {
    return <div>Proposal not found</div>;
  }

  return (
    <div className="bg-white print-root">
      <style>{`
        @page { size: A4; margin: 0; }
        html, body, .print-root { width: 210mm; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print { .no-print { display: none !important; } }
        [id^="page-"] { width: 210mm !important; height: 297mm !important; break-inside: avoid; page-break-after: auto; overflow: hidden; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #page-five { page-break-after: auto; }
        .text-5xl { font-size: 54px !important; line-height: 1.15 !important; }
        [id^="page-"] * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        :root { --color-primary: ${colors.primary}; --color-secondary: ${colors.secondary}; --color-accent: ${colors.accent}; }
      `}</style>
      <PrintTemplateSwitcher
        proposal={proposal as any}
        branding={branding as any}
        pages={pages}
        print
        extrasRows={extrasRows}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){function check(){var el=document.querySelector('[data-extras-ready="true"]'); if(el){ window.__EXTRAS_READY__=true; } else { setTimeout(check,100);} } check();})();`,
        }}
      />
    </div>
  );
}
