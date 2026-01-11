import { TemplateType } from '@/features/templates/types/templates';
import Image from 'next/image';
import { cn, formatCurrencySafe } from '@/lib/utils';
import React from 'react';
import ProposalTitle from '../shared/proposal-title';
import { arvo } from '@/lib/fonts';

interface ScopeOfServiceProps {
  title: string;
  content: string;
  templateType: TemplateType;
  className?: string;
  description?: string;
}

export default function ScopeOfService({
  title,
  content,
  templateType,
  className = '',
  description = '',
}: ScopeOfServiceProps) {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const isBullet = (l: string) => /^[-*]\s+/.test(l);
  const isHeader = (l: string) => /^#{1,3}\s+/.test(l);
  const isFenceOpen = (l: string) =>
    l.startsWith('```') && l.toLowerCase().includes('veliz_scope_table');
  const fenceRanges: Array<[number, number]> = [];
  {
    let inFence = false;
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (!inFence && isFenceOpen(ln)) {
        inFence = true;
        start = i;
        continue;
      }
      if (inFence && ln.startsWith('```')) {
        fenceRanges.push([start, i]);
        inFence = false;
        start = -1;
      }
    }
  }
  const isInsideFence = (idx: number) =>
    fenceRanges.some(([s, e]) => idx >= s && idx <= e);
  const firstParagraphIndex = lines.findIndex(
    (l, idx) =>
      l &&
      !isBullet(l) &&
      !isHeader(l) &&
      !isFenceOpen(l) &&
      !isInsideFence(idx)
  );

  const parseInline = (text: string) => {
    const parts: React.ReactNode[] = [];
    let idx = 0;
    const re = /(\*\*|__)(.*?)\1/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > idx) parts.push(text.slice(idx, m.index));
      parts.push(
        <strong key={`b-${m.index}`} className="font-semibold text-gray-900">
          {m[2]}
        </strong>
      );
      idx = m.index + m[0].length;
    }
    if (idx < text.length) parts.push(text.slice(idx));
    return parts.length ? parts : text;
  };

  type ScopeTableData = {
    rows: Array<{
      area: string;
      frequency: string;
      costPerVisit?: string | null;
      monthlyCost?: string | null;
      note?: string | null;
    }>;
  };

  const ScopeTable = ({ data }: { data: ScopeTableData }) => {
    const rows = data?.rows ?? [];
    if (!rows.length) return null;
    const premium = rows.some((r) => typeof r.note === 'string');
    return (
      <div className="mb-6">
        <div className="text-white">
          {premium ? (
            <>
              <div
                className={`text-center grid grid-cols-4 text-[var(--color-primary)] gap-4 sm:px-5 px-2 mb-2 sm:text-base text-xs
                ${
                  templateType === 'luxury_elite'
                    ? `${arvo.className} font-normal`
                    : 'font-semibold'
                }`}
              >
                <div className="">Area serviced</div>
                <div className="">Frequency</div>
                <div className=" col-span-2">Notes</div>
              </div>
              {rows.map((row, i) => (
                <div
                  key={`scope-row-${i}`}
                  className={`rounded-3xl px-5 sm:py-3 py-1 mb-2 
                    ${
                      templateType === 'modern_corporate'
                        ? i % 2 === 0
                          ? 'bg-[var(--color-primary)]/8 text-[#383838] shadow-2xs'
                          : 'bg-[var(--color-primary)]/3 text-[#383838] shadow-2xs'
                        : templateType === 'luxury_elite'
                        ? i % 2 === 0
                          ? `bg-[var(--color-primary)]  text-white !rounded-none ${arvo.className}`
                          : `bg-[var(--color-primary)]/70 text-white !rounded-none ${arvo.className}`
                        : 'bg-[var(--color-primary)] text-white'
                    }`}
                >
                  <div className="grid grid-cols-4 gap-4 text-xs justify-center items-center text-center">
                    <div
                      className={`whitespace-pre-line font-bold ${
                        templateType === 'modern_corporate'
                          ? 'text-[var(--color-primary)]'
                          : 'text-white'
                      }`}
                    >
                      {row.area}
                    </div>
                    <div className="">{row.frequency}</div>
                    <div className="whitespace-pre-line col-span-2">
                      {row.note || ''}
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="text-center grid grid-cols-2 text-[var(--color-primary)] sm:grid-cols-4 gap-4 px-5 mb-2">
                <div className="font-semibold">Area serviced</div>
                <div className="font-semibold">Frequency</div>
                <div className="font-semibold">Cost per visit</div>
                <div className="font-semibold">Monthly cost</div>
              </div>
              {rows.map((row, i) => (
                <div
                  key={`scope-row-${i}`}
                  className="rounded-3xl px-5 py-3 bg-black mb-2"
                >
                  <div className="text-center grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs justify-center items-center">
                    <div className="whitespace-pre-line">{row.area}</div>
                    <div>{row.frequency}</div>
                    <div>{formatCurrencySafe(row.costPerVisit) ?? 'N/A'}</div>
                    <div className="font-bold">
                      {formatCurrencySafe(row.monthlyCost) ?? 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderRest = () => {
    const elements: React.ReactNode[] = [];
    let bulletsAcc: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (i === firstParagraphIndex) continue;
      const trimmed = lines[i];
      if (!trimmed) continue;
      if (
        trimmed.startsWith('```') &&
        trimmed.toLowerCase().includes('veliz_scope_table')
      ) {
        const jsonLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          jsonLines.push(lines[i]);
          i++;
        }
        const jsonText = jsonLines.join('\n');
        try {
          const data: ScopeTableData = JSON.parse(jsonText);
          elements.push(<ScopeTable key={`scope-table`} data={data} />);
        } catch {}
        continue;
      }
      if (/^[-*]\s+/.test(trimmed)) {
        bulletsAcc.push(trimmed.replace(/^[-*]\s+/, ''));
        continue;
      }
      elements.push(
        <p
          key={`p-${i}`}
          className="text-sm text-[#383838] mb-4 leading-relaxed"
        >
          {parseInline(trimmed)}
        </p>
      );
    }
    return elements;
  };

  return (
    <div>
      <div>
        <ProposalTitle templateType={templateType} title={title} />
        <p
          className={`text-xs sm:text-sm text-[#383838] sm:my-6 my-3 leading-relaxed ${
            templateType === 'luxury_elite' ? arvo.className : ''
          }`}
        >
          {description}
        </p>
        {renderRest()}
      </div>
    </div>
  );
}
