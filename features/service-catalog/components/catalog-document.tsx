import ReactMarkdown from 'react-markdown';
import { catalogDocumentText } from '../document';

export function CatalogDocument({ content, companyName, branding, showPoweredBy = false }: { content: string; companyName?: string; branding?: { logo_url?: string | null; phone?: string | null; email?: string | null }; showPoweredBy?: boolean }) {
  return <article className="catalog-document mx-auto max-w-3xl bg-white p-5 text-gray-900 sm:p-10" data-extras-ready="true">
    <style>{`.catalog-document { overflow-wrap: anywhere; font-family: Arial, sans-serif; line-height: 1.55; }
      .catalog-document h2 { font-size: 1.35rem; font-weight: 700; margin: 1.5rem 0 .65rem; color: #163454; break-after: avoid; }
      .catalog-document h3 { font-weight: 600; margin: 1rem 0 .5rem; break-after: avoid; }
      .catalog-document p { margin: .65rem 0; } .catalog-document ul { list-style: disc; padding-left: 1.4rem; }
      .catalog-document li { margin: .35rem 0; break-inside: avoid; }
      @media print { .catalog-document { max-width: none; padding: 0; font-size: 10pt; } }`}</style>
    {branding?.logo_url && <img src={branding.logo_url} alt={companyName || 'Cleaning company'} className="mb-3 max-h-20 max-w-48 object-contain" />}
    {branding && <p>{[branding.phone, branding.email].filter(Boolean).join(' · ')}</p>}
    {companyName && <p className="text-xl font-bold">{companyName}</p>}
    <ReactMarkdown>{catalogDocumentText(content)}</ReactMarkdown>
    {showPoweredBy && <footer className="mt-8 border-t pt-3 text-xs text-gray-500">Prepared with Veltex AI</footer>}
  </article>;
}
