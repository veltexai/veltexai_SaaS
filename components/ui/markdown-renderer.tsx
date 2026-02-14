'use client';

import { useUserBranding } from '@/hooks/use-user-branding';
import React from 'react';
import { getIconForLabel } from '@/lib/icon-map';
import ProposalAcceptance from '@/features/templates/components/shared/proposal-acceptance';
import { dmSerifText } from '@/lib/fonts';
import {
  ShieldIcon,
  LocationIcon,
  StartIcon,
  EductationIcon,
} from '@/components/icons';
import { formatCurrencySafe } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { isOneTimeFrequency, isStandardJanitorialService } from '@/lib/recurring-monthly-functions';
import { FrequencyLabel } from '@/features/templates/components';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  showAcceptance?: boolean;
  acceptanceTemplate?: 'modern' | 'classic' | 'minimal' | 'professional';
  acceptanceClientName?: string;
  acceptanceCompanyName?: string;
  proposalId?: string;
  additionalServicesRows?: Array<{
    service: string;
    pricePerTime: string | null;
    pricePerMonth: string | null;
  }>;
}

type ScopeTableData = {
  rows: Array<{
    area: string;
    frequency: string;
    costPerVisit?: string | null;
    monthlyCost?: string | null;
    note?: string | null;
  }>;
};

type AdditionalServicesData = {
  rows: Array<{
    service: string;
    pricePerTime: string | null;
    pricePerMonth: string | null;
  }>;
};

type PricingTableData = {
  rows: Array<{
    service: string;
    frequency: string;
    pricePerMonth: string;
  }>;
  summary?: {
    subtotal: string;
    tax: string;
    total: string;
  };
};

export function MarkdownRenderer({
  content,
  className = '',
  showAcceptance = false,
  acceptanceTemplate = 'minimal',
  acceptanceClientName,
  acceptanceCompanyName,
  proposalId,
  additionalServicesRows,
}: MarkdownRendererProps) {
  const { settings } = useUserBranding();
  let extrasIncluded = false;
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let listCounter = 1;
    let elementCounter = 0; // Add unique counter
    let currentSection: string | null = null;
    let extrasDataFromJson: AdditionalServicesData | null = null;
    let extrasRendered = false;
    let aboutIntroMarginNeeded = false;
    let aboutIntroRendered = false;

    const renderListItem = (rawText: string, key: string) => {
      const labelMatch = rawText.match(/^(\*\*|__)[\s]*([^*]+?)[\s]*\1/);
      const label = labelMatch?.[2]?.trim();
      const IconResolved = getIconForLabel(label ?? rawText);
      const inAbout =
        !!currentSection && currentSection.includes('about our company');
      let Icon = IconResolved;
      if (inAbout) {
        const norm = (label ?? rawText).toLowerCase();
        if (/\bservice\s+area\b/.test(norm)) Icon = LocationIcon;
        else if (/years?/.test(norm) && /business/.test(norm))
          Icon = ShieldIcon;
        else if (/(education|office|offices|retail|healthcare)/.test(norm))
          Icon = EductationIcon;
        else if (/(satisfaction|100%)/.test(norm)) Icon = StartIcon;
      }

      if (inAbout) {
        return (
          <div key={key} className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6 md:p-10 pr-4 sm:pr-6 md:pr-8 pb-6 sm:pb-8 md:pb-12">
            {Icon ? (
              <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-[var(--color-primary)] flex-shrink-0" />
            ) : null}
            <div
              className={`italic text-[#383838] ${dmSerifText.className} text-base sm:text-lg md:text-xl leading-relaxed font-semibold`}
            >
              {parseInlineMarkdown(rawText)}
            </div>
          </div>
        );
      }

      return (
        <li
          key={key}
          className={`text-xs sm:text-sm text-[#383838] mb-3 sm:mb-5 ${Icon ? 'list-none' : ''}`}
        >
          <div className={`flex items-start ${Icon ? 'gap-2 sm:gap-3' : ''}`}>
            {Icon ? (
              <Icon className="mt-[2px] text-[var(--color-primary)] flex-shrink-0 h-4 w-4 sm:h-5 sm:w-5" />
            ) : null}
            <div
              className="leading-relaxed break-words"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {parseInlineMarkdown(rawText)}
            </div>
          </div>
        </li>
      );
    };

    const renderSplitHeading = (
      level: 1 | 2 | 3,
      rawText: string,
      key: string
    ) => {
      // Strip leading numeric prefixes like "1) " or "01. "
      const text = rawText.replace(/^\d+\s*[-.)]?\s*/, '').trim();
      const words = text.split(/\s+/);

      const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      const isAboutHeading = /about\s+our\s+company/i.test(rawText);
      const baseClass =
        level === 1
          ? isAboutHeading
            ? 'text-2xl sm:text-3xl md:text-5xl leading-[100%] mb-3 sm:mb-4 mt-3 sm:mt-4'
            : 'text-2xl sm:text-3xl md:text-5xl mb-3 sm:mb-4 mt-3 sm:mt-4'
          : level === 2
          ? 'text-base sm:text-lg font-bold mb-2 sm:mb-3 mt-3 sm:mt-4'
          : 'text-sm sm:text-base font-semibold mb-2 mt-3 sm:mt-4';

      // Only split for multi-word headings; accent the last word
      if (words.length >= 2 && level !== 3) {
        const last = words.pop() as string;
        const first = words.join(' ');
        return (
          <Tag key={key} className={`text-[var(--color-primary)] ${baseClass}`}>
            <span className="">{parseInlineMarkdown(first)}</span>{' '}
            <span className={`font-bold ${isAboutHeading ? '' : 'lowercase'}`}>
              {parseInlineMarkdown(last)}
            </span>
          </Tag>
        );
      }

      // Fallback: no split or level 3
      return (
        <Tag key={key} className={`${baseClass} text-[var(--color-primary)]`}>
          {parseInlineMarkdown(text)}
        </Tag>
      );
    };

    const flushList = () => {
      if (currentList.length > 0) {
        if (listType === 'ul') {
          const inAbout =
            !!currentSection && currentSection.includes('about our company');
          if (inAbout) {
            const firstRow = currentList.slice(0, 2);
            const secondRow = currentList.slice(2);
            elements.push(
              <div key={`about-grid-${elementCounter++}`} className="mt-6 sm:mt-8 md:mt-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                  {firstRow}
                </div>
                <div className="border-t border-gray-200" />
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">{secondRow}</div>
              </div>
            );
          } else {
            elements.push(
              <ul key={`ul-${elementCounter++}`} className="mb-2 sm:mb-3 space-y-1 sm:space-y-2">
                {currentList}
              </ul>
            );
          }
        } else if (listType === 'ol') {
          elements.push(
            <ol
              key={`ol-${elementCounter++}`}
              className="list-decimal list-inside mb-2 sm:mb-3 ml-2 sm:ml-4 space-y-1 sm:space-y-2"
            >
              {currentList}
            </ol>
          );
        }
        currentList = [];
        listType = null;
        listCounter = 1;
      }
    };

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const trimmedLine = line.trim();

      // Skip empty lines but add spacing
      if (!trimmedLine) {
        flushList();
        continue;
      }

      // Custom fenced JSON blocks for structured tables
      if (trimmedLine.startsWith('```veliz_scope_table')) {
        flushList();
        let jsonLines: string[] = [];
        index++;
        while (index < lines.length && !lines[index].trim().startsWith('```')) {
          jsonLines.push(lines[index]);
          index++;
        }
        const jsonText = jsonLines.join('\n');
        try {
          const rawData: ScopeTableData = JSON.parse(jsonText);

          // Post-process: if any "area" contains commas, split into multiple rows
          const processedRows: typeof rawData.rows = [];
          if (Array.isArray(rawData.rows)) {
            for (const row of rawData.rows) {
              if (typeof row.area === 'string' && row.area.includes(',')) {
                const splitAreas = row.area
                  .split(',')
                  .map((s) => s.trim())
                  .filter((s) => s);
                for (const areaName of splitAreas) {
                  processedRows.push({
                    ...row,
                    area: areaName,
                  });
                }
              } else {
                processedRows.push(row);
              }
            }
          }
          const data = { ...rawData, rows: processedRows };

          elements.push(
            <ScopeTable key={`scope-${elementCounter++}`} data={data} />
          );
        } catch {
          // If parsing fails, fall back to showing raw content
          elements.push(
            <pre
              key={`scope-fallback-${elementCounter++}`}
              className="bg-muted p-3 rounded"
            >
              {jsonText}
            </pre>
          );
        }
        continue;
      }

      if (trimmedLine.startsWith('```veliz_additional_services')) {
        flushList();
        let jsonLines: string[] = [];
        index++;
        while (index < lines.length && !lines[index].trim().startsWith('```')) {
          jsonLines.push(lines[index]);
          index++;
        }
        const jsonText = jsonLines.join('\n');
        try {
          const data: AdditionalServicesData = JSON.parse(jsonText);
          extrasDataFromJson = data;
        } catch {
          extrasDataFromJson = { rows: [] };
        }
        continue;
      }

      if (trimmedLine.startsWith('```veliz_pricing_table')) {
        flushList();
        let jsonLines: string[] = [];
        index++;
        while (index < lines.length && !lines[index].trim().startsWith('```')) {
          jsonLines.push(lines[index]);
          index++;
        }
        const jsonText = jsonLines.join('\n');
        try {
          const data: PricingTableData = JSON.parse(jsonText);
          elements.push(
            <PricingTable key={`pricing-${elementCounter++}`} data={data} />
          );
        } catch {
          elements.push(
            <pre
              key={`pricing-fallback-${elementCounter++}`}
              className="bg-muted p-3 rounded"
            >
              {jsonText}
            </pre>
          );
        }
        continue;
      }

      // Headers
      if (trimmedLine.startsWith('###')) {
        flushList();
        const text = trimmedLine.replace(/^###\s*/, '');
        elements.push(renderSplitHeading(3, text, `h3-${index}`));
        const norm = text.toLowerCase();
        if (
          !extrasRendered &&
          (norm.includes('additional services to be invoiced') ||
            norm.includes('additional services'))
        ) {
          elements.push(
            <AdditionalServicesTable
              key={`extras-${elementCounter++}`}
              proposalId={proposalId}
              data={{
                rows: additionalServicesRows ?? extrasDataFromJson?.rows ?? [],
              }}
            />
          );
          extrasRendered = true;
        }
      } else if (trimmedLine.startsWith('##')) {
        flushList();
        const text = trimmedLine.replace(/^##\s*/, '');
        currentSection = text.toLowerCase();
        if (/about\s+our\s+company/i.test(text)) {
          aboutIntroMarginNeeded = true;
          aboutIntroRendered = false;
        }
        elements.push(renderSplitHeading(2, text, `h2-${index}`));
        const norm = text.toLowerCase();
        if (
          !extrasRendered &&
          (norm.includes('additional services to be invoiced') ||
            norm.includes('additional services'))
        ) {
          elements.push(
            <AdditionalServicesTable
              key={`extras-${elementCounter++}`}
              proposalId={proposalId}
              data={{
                rows: additionalServicesRows ?? extrasDataFromJson?.rows ?? [],
              }}
            />
          );
          extrasRendered = true;
        }
      } else if (trimmedLine.startsWith('#')) {
        flushList();
        const text = trimmedLine.replace(/^#\s*/, '');
        currentSection = text.toLowerCase();
        if (/about\s+our\s+company/i.test(text)) {
          aboutIntroMarginNeeded = true;
          aboutIntroRendered = false;
        }
        elements.push(renderSplitHeading(1, text, `h1-${index}`));
        const norm = text.toLowerCase();
        if (
          !extrasRendered &&
          (norm.includes('additional services to be invoiced') ||
            norm.includes('additional services'))
        ) {
          elements.push(
            <AdditionalServicesTable
              key={`extras-${elementCounter++}`}
              proposalId={proposalId}
              data={{
                rows: additionalServicesRows ?? extrasDataFromJson?.rows ?? [],
              }}
            />
          );
          extrasRendered = true;
        }
      }
      // Bullet points
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        const text = trimmedLine.replace(/^[-*]\s*/, '');
        currentList.push(
          renderListItem(text, `li-${index}-${currentList.length}`)
        );
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(trimmedLine)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
          listCounter = 1;
        }
        const text = trimmedLine.replace(/^\d+\.\s*/, '');
        currentList.push(
          renderListItem(text, `li-${index}-${currentList.length}`)
        );
        listCounter++;
      }
      // Strip accidental salutations (Dear/Hello/Hi) at start of cover letter
      else if (/^(Dear|Hello|Hi)\b[\s,]/i.test(trimmedLine)) {
        flushList();
        // Skip rendering this line entirely
        continue;
      }
      // Letter-prefixed paragraphs (A. B. C. ...) — bold the marker
      else if (/^[A-Z]\.\s+/.test(trimmedLine)) {
        flushList();
        const match = trimmedLine.match(/^([A-Z])\.\s+(.*)$/);
        const marker = match?.[1] ?? '';
        const rest = match?.[2] ?? trimmedLine;
        const inNoMarginSection =
          !!currentSection &&
          (currentSection.includes('legal responsibility') ||
            currentSection.includes('additional services'));
        const pClass = inNoMarginSection
          ? 'text-xs sm:text-sm text-[#383838] leading-normal mb-0'
          : 'text-xs sm:text-sm text-[#383838] leading-normal mb-3 sm:mb-4';
        elements.push(
          <p key={`letter-${index}`} className={pClass}>
            <strong className="font-semibold mr-1">{marker}.</strong>
            <span>{parseInlineMarkdown(rest)}</span>
          </p>
        );
      }
      // Cover letter closing — force a line break after "Sincerely,"
      else if (/^Sincerely,/.test(trimmedLine)) {
        flushList();
        const m = trimmedLine.match(/^Sincerely,\s*(.*)$/);
        const rest = m?.[1] ?? '';
        elements.push(
          <p
            key={`sinc-${index}`}
            className="text-xs sm:text-sm text-[#383838] mb-1 leading-relaxed"
          >
            Sincerely,
          </p>
        );
        if (rest) {
          elements.push(
            <p
              key={`sinc-rest-${index}`}
              className="font-black italic text-xs sm:text-sm text-[#383838] mb-5 sm:mb-7 leading-relaxed"
            >
              {parseInlineMarkdown(rest)}
            </p>
          );
        } else {
          // If the company name is on the next line, render it here and consume that line.
          const next = lines[index + 1]?.trim() ?? '';
          const isRenderableNext =
            next.length > 0 &&
            !/^###/.test(next) &&
            !/^##/.test(next) &&
            !/^#/.test(next) &&
            !/^[-*]\s+/.test(next) &&
            !/^\d+\.\s+/.test(next) &&
            !/^[A-Z]\.\s+/.test(next) &&
            !/^(Dear|Hello|Hi)\b[\s,]/i.test(next);
          if (isRenderableNext) {
            elements.push(
              <p
                key={`sinc-next-${index}`}
                className="font-black italic text-xs sm:text-sm text-[#383838] mb-5 sm:mb-7 leading-relaxed"
              >
                {parseInlineMarkdown(next)}
              </p>
            );
            // Skip the consumed next line
            index += 1;
          }
        }
      }
      // Regular paragraphs
      else {
        // Special handling for "Scope of Service" section: split comma-separated values into rows
        if (
          currentSection &&
          /scope\s+of\s+service/i.test(currentSection) &&
          trimmedLine.includes(',')
        ) {
          if (listType !== 'ul') {
            flushList();
            listType = 'ul';
          }
          const items = trimmedLine
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s);
          items.forEach((item, i) => {
            currentList.push(renderListItem(item, `li-scope-${index}-${i}`));
          });
          continue;
        }

        flushList();
        const needsAboutMargin =
          !!currentSection &&
          currentSection.includes('about our company') &&
          aboutIntroMarginNeeded &&
          !aboutIntroRendered;
        const pClass = needsAboutMargin
          ? 'text-xs sm:text-sm text-[#383838] mb-3 sm:mb-4 leading-relaxed mt-6 sm:mt-8'
          : 'text-xs sm:text-sm text-[#383838] mb-3 sm:mb-4 leading-relaxed';
        elements.push(
          <p key={`p-${index}`} className={pClass}>
            {parseInlineMarkdown(trimmedLine)}
          </p>
        );
        if (needsAboutMargin) {
          aboutIntroRendered = true;
          aboutIntroMarginNeeded = false;
        }
      }
    }

    // Flush any remaining list
    flushList();

    return elements;
  };

  const parseInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    // Handle bold text (**text** or __text__)
    const boldRegex = /(\*\*|__)(.*?)\1/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index));
      }

      // Add the bold text
      parts.push(
        <strong
          key={`bold-${match.index}`}
          className="font-semibold text-gray-900"
        >
          {match[2]}
        </strong>
      );

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }
    // Special case: italicize literal "(Optional)" wherever it appears
    const finalParts: React.ReactNode[] = [];
    const OPTIONAL = '(Optional)';
    parts.forEach((part, idx) => {
      if (typeof part === 'string') {
        const segments = part.split(/(\(Optional\))/);
        segments.forEach((seg, j) => {
          if (seg === OPTIONAL) {
            finalParts.push(
              <em
                key={`optional-${idx}-${j}`}
                className={`italic text-xl sm:text-2xl md:text-4xl capitalize ${dmSerifText.className}`}
              >
                {OPTIONAL}
              </em>
            );
          } else if (seg) {
            finalParts.push(seg);
          }
        });
      } else {
        finalParts.push(part);
      }
    });

    return finalParts.length > 0 ? finalParts : text;
  };

  const rendered = parseMarkdown(content);

  return (
    <div className={`prose prose-sm max-w-none overflow-x-hidden ${className}`}>
      <div className="break-words">
        {rendered}
      </div>
      {showAcceptance ? (
        <div className="mt-4 sm:mt-6">
          <ProposalAcceptance
            template={acceptanceTemplate}
            clientName={acceptanceClientName}
            companyName={acceptanceCompanyName}
          />
        </div>
      ) : null}
    </div>
  );
}

function ScopeTable({ data }: { data: ScopeTableData }) {
  const rows = data?.rows ?? [];
  if (!rows.length) return null;
  const premium = rows.some((r) => typeof r.note === 'string');
  
  // Maximum rows per page section for PDF (prevents overflow)
  const MAX_ROWS_PER_SECTION = 8;
  const needsPagination = rows.length > MAX_ROWS_PER_SECTION;
  
  // Split rows into chunks for pagination
  const rowChunks: typeof rows[] = [];
  if (needsPagination) {
    for (let i = 0; i < rows.length; i += MAX_ROWS_PER_SECTION) {
      rowChunks.push(rows.slice(i, i + MAX_ROWS_PER_SECTION));
    }
  } else {
    rowChunks.push(rows);
  }
  
  const renderHeader = (isPremium: boolean) => {
    if (isPremium) {
      return (
        <div className="hidden sm:grid text-center grid-cols-3 text-[var(--color-primary)] gap-2 sm:gap-4 px-3 sm:px-5 mb-2">
          <div className="font-semibold text-xs sm:text-sm">Area serviced</div>
          <div className="font-semibold text-xs sm:text-sm">Frequency</div>
          <div className="font-semibold text-xs sm:text-sm">Notes</div>
        </div>
      );
    }
    return (
      <div className="hidden sm:grid text-center grid-cols-2 text-[var(--color-primary)] sm:grid-cols-4 gap-2 sm:gap-4 px-3 sm:px-5 mb-2">
        <div className="font-semibold text-xs sm:text-sm">Area serviced</div>
        <div className="font-semibold text-xs sm:text-sm">Frequency</div>
        <div className="font-semibold text-xs sm:text-sm">Cost per visit</div>
        <div className="font-semibold text-xs sm:text-sm">Monthly cost</div>
      </div>
    );
  };
  
  const renderRow = (row: typeof rows[0], i: number, isPremium: boolean) => {
    if (isPremium) {
      return (
        <div
          key={`scope-row-${i}`}
          className="rounded-2xl sm:rounded-3xl px-3 sm:px-5 py-2 sm:py-3 bg-[var(--color-primary)] mb-2"
        >
          {/* Mobile: stacked layout */}
          <div className="sm:hidden space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-white/70">Area:</span>
              <span className="text-white/90 text-right">{row.area}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Frequency:</span>
              <span className="text-white/90">{row.frequency}</span>
            </div>
            {row.note && (
              <div className="flex justify-between">
                <span className="text-white/70">Notes:</span>
                <span className="text-white font-medium text-right">{row.note}</span>
              </div>
            )}
          </div>
          {/* Desktop: grid layout */}
          <div className="hidden sm:grid grid-cols-3 gap-2 sm:gap-4 text-xs justify-center items-center text-center">
            <div className="whitespace-pre-line text-white/90">
              {row.area}
            </div>
            <div className="text-white/90">{row.frequency}</div>
            <div className="text-white font-medium whitespace-pre-line">
              {row.note || ''}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div
        key={`scope-row-${i}`}
        className="rounded-2xl sm:rounded-3xl px-3 sm:px-5 py-2 sm:py-3 bg-[var(--color-primary)] mb-1"
      >
        {/* Mobile: stacked layout */}
        <div className="sm:hidden space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-white/70">Area:</span>
            <span className="text-white/90 text-right">{row.area}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Frequency:</span>
            <span className="text-white/90">{row.frequency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Cost/visit:</span>
            <span className="text-white/90">{formatCurrencySafe(row.costPerVisit) ?? 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Monthly:</span>
            <span className="text-white font-bold">{formatCurrencySafe(row.monthlyCost) ?? 'N/A'}</span>
          </div>
        </div>
        {/* Desktop: grid layout */}
        <div className="hidden sm:grid text-center grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs justify-center items-center">
          <div className="whitespace-pre-line">{row.area}</div>
          <div>{row.frequency}</div>
          <div>{formatCurrencySafe(row.costPerVisit) ?? 'N/A'}</div>
          <div className="font-bold">
            {formatCurrencySafe(row.monthlyCost) ?? 'N/A'}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="mb-4 sm:mb-6 overflow-x-auto">
      <div className="text-white min-w-[280px]">
        {rowChunks.map((chunk, chunkIndex) => (
          <div 
            key={`scope-chunk-${chunkIndex}`}
            // Add page-break-before for continuation chunks (for PDF rendering)
            style={chunkIndex > 0 ? { pageBreakBefore: 'always', paddingTop: '20px' } : undefined}
          >
            {/* Show header for first chunk and continuation chunks */}
            {renderHeader(premium)}
            {chunkIndex > 0 && (
              <div className="text-[var(--color-primary)] font-semibold text-sm mb-2 print:block hidden">
                Scope of Service (continued)
              </div>
            )}
            {chunk.map((row, i) => renderRow(row, chunkIndex * MAX_ROWS_PER_SECTION + i, premium))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdditionalServicesTable({
  data,
  proposalId,
}: {
  data?: AdditionalServicesData;
  proposalId?: string;
}) {
  const [rows, setRows] = React.useState<
    Array<{
      service: string;
      pricePerTime: string | null;
      pricePerMonth: string | null;
    }>
  >(data?.rows ?? []);

  const computeMonthly = (subtotal: any, frequency: string | null) => {
    const raw =
      typeof subtotal === 'number'
        ? subtotal
        : parseFloat(String(subtotal).replace(/[^0-9.-]/g, '')) || 0;
    if (!frequency) return null;
    const f = frequency.toLowerCase();
    if (f === 'monthly') return formatCurrencySafe(raw);
    if (f === 'quarterly') return formatCurrencySafe(raw / 3.0);
    if (f === 'annual') return formatCurrencySafe(raw / 12.0);
    return null;
  };

  React.useEffect(() => {
    let mounted = true;
    async function loadFromDb() {
      if ((rows?.length ?? 0) > 0) return;
      if (!proposalId) return;
      const supabase = createClient();
      const { data: pas } = await supabase
        .from('proposal_additional_services')
        .select('label, frequency, subtotal, monthly_amount')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: true });
      if (!mounted) return;
      if (pas && pas.length) {
        const mapped = pas.map((r: any) => ({
          service: r.label,
          pricePerTime: formatCurrencySafe(r.subtotal),
          pricePerMonth:
            r.monthly_amount != null
              ? formatCurrencySafe(r.monthly_amount)
              : computeMonthly(r.subtotal, r.frequency),
        }));
        setRows(mapped);
      }
    }
    loadFromDb();
    return () => {
      mounted = false;
    };
  }, [proposalId]);

  if (!(rows?.length ?? 0)) return null;

  return (
    <div className="my-4 sm:my-6 space-y-2 sm:space-y-3 overflow-x-auto" data-extras-ready="true">
      <div className="min-w-[280px]">
        {/* Header - hidden on mobile */}
        <div className="hidden sm:grid grid-cols-4 gap-2 sm:gap-4 px-3 sm:px-5 text-center">
          <div className="text-[var(--color-primary)] font-bold text-xs sm:text-sm col-span-2">
            Service
          </div>
          <div className="text-[var(--color-primary)] font-bold text-xs sm:text-sm">Price/time</div>
          <div className="text-[var(--color-primary)] font-bold text-xs sm:text-sm">Price/month</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={`extras-row-${i}`}
            className="rounded-2xl sm:rounded-3xl bg-[var(--color-primary)] text-white px-3 sm:px-5 py-2 sm:py-3 mb-1"
          >
            {/* Mobile: stacked layout */}
            <div className="sm:hidden space-y-1 text-xs">
              <div className="font-medium text-white mb-1">{r.service}</div>
              <div className="flex justify-between">
                <span className="text-white/70">Price/time:</span>
                <span className="text-white/90">{r.pricePerTime ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Price/month:</span>
                <span className="text-white font-bold">{r.pricePerMonth ?? 'N/A'}</span>
              </div>
            </div>
            {/* Desktop: grid layout */}
            <div className="hidden sm:grid grid-cols-4 gap-2 sm:gap-4 text-xs items-center justify-center text-center">
              <div className="whitespace-pre-line col-span-2">{r.service}</div>
              <div>{r.pricePerTime ?? 'N/A'}</div>
              <div className="font-bold">{r.pricePerMonth ?? 'N/A'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



function PricingTable({ data }: { data: PricingTableData }) {
  const rows = data?.rows ?? [];
  const summary = data?.summary;
  if (!rows.length) return null;
  return (
    <div className="my-4 sm:my-6 space-y-2 sm:space-y-3 overflow-x-auto">
      <div className="min-w-[280px]">
        {/* Header - hidden on mobile */}
        <div className="hidden sm:grid grid-cols-3 gap-2 sm:gap-4 px-3 sm:px-5 text-center">
          <div className="text-[var(--color-primary)] font-bold text-xs sm:text-sm">Service</div>
          <div className="text-[var(--color-primary)] font-bold text-xs sm:text-sm">Frequency</div>
          <div className="text-[var(--color-primary)] font-bold text-xs sm:text-sm">Price/month</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={`pricing-row-${i}`}
            className="rounded-2xl sm:rounded-3xl bg-[var(--color-primary)] text-white px-3 sm:px-5 py-2 sm:py-3 mb-1"
          >
            {/* Mobile: stacked layout */}
            <div className="sm:hidden space-y-1 text-xs">
              <div className="font-medium text-white mb-1">{r.service}</div>
              <div className="flex justify-between">
                <span className="text-white/70">Frequency:</span>
                <span className="text-white/90">{isStandardJanitorialService(r.service) ?<FrequencyLabel frequency={r.frequency} /> : r.frequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Price/month:</span>
                <span className="text-white font-bold">{r.pricePerMonth}</span>
              </div>
            </div>
            {/* Desktop: grid layout */}
            <div className="hidden sm:grid grid-cols-3 gap-2 sm:gap-4 text-xs items-center justify-center text-center">
              <div className="whitespace-pre-line">{r.service}</div>
              <div>{isStandardJanitorialService(r.service) ? <FrequencyLabel frequency={r.frequency} />: r.frequency}</div>
              <div className="font-bold">{r.pricePerMonth}</div>
            </div>
          </div>
        ))}
        {summary ? (
          <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2">
            <div className="flex justify-between px-3 sm:px-5">
              <span className="text-xs sm:text-sm">Sub-total</span>
              <span className="font-semibold text-xs sm:text-sm">{summary.subtotal}</span>
            </div>
            <div className="flex justify-between px-3 sm:px-5">
              <span className="text-xs sm:text-sm">Tax</span>
              <span className="font-semibold text-xs sm:text-sm">{summary.tax}</span>
            </div>
            <div className="flex justify-between px-3 sm:px-5">
              <span className="text-xs sm:text-sm">Total</span>
              <span className="font-semibold text-xs sm:text-sm">{summary.total}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
