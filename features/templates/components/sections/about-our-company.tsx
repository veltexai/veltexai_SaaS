import React from 'react';
import { TemplateType } from '@/features/templates/types/templates';
import { dmSerifText } from '@/lib/fonts';
import { getIconForLabel } from '@/lib/icon-map';
import {
  ShieldIcon,
  LocationIcon,
  StartIcon,
  EductationIcon,
} from '@/components/icons';
import ProposalTitle from '../shared/proposal-title';
import { SplitLabel } from '../shared/split-label';

interface AboutOurCompanyProps {
  title: string;
  content: string;
  templateType: TemplateType;
  className?: string;
}

export default function AboutOurCompany({
  title,
  content,
  templateType,
  className = '',
}: AboutOurCompanyProps) {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const firstParagraphIndex = lines.findIndex((l) => !/^[-*]\s+/.test(l));
  const bullets = lines
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, ''));
  const firstParagraph =
    firstParagraphIndex >= 0 ? lines[firstParagraphIndex] : '';

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

  const resolveIcon = (raw: string) => {
    const labelMatch = raw.match(/^(\*\*|__)[\s]*([^*]+?)[\s]*\1/);
    const label = labelMatch?.[2]?.trim();
    let Icon = getIconForLabel(label ?? raw);
    const norm = (label ?? raw).toLowerCase();
    if (/\bservice\s+area\b/.test(norm)) Icon = LocationIcon;
    else if (/years?/.test(norm) && /business/.test(norm)) Icon = ShieldIcon;
    else if (/(education|office|offices|retail|healthcare|residential)/.test(norm))
      Icon = EductationIcon;
    else if (/(satisfaction|100%)/.test(norm)) Icon = StartIcon;
    return Icon;
  };

  const Bullet = ({ raw }: { raw: string }) => {
    console.log('raw', raw);
    
    const Icon = resolveIcon(raw);

    return (
      <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-10 sm:pr-4">
        {Icon ? (
          <Icon className="sm:h-8 h-4 sm:w-8 w-4 text-[var(--color-primary)] flex-shrink-0" />
        ) : null}
        <div
          className={`italic text-[#383838] ${dmSerifText.className} text-2xs sm:text-xl leading-relaxed font-semibold`}
        >
          {parseInline(raw)}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className={className}>
        <ProposalTitle templateType={templateType} title={title} />
        {firstParagraph ? (
          <p className="sm:text-sm text-2xs text-[#383838] sm:mb-4 mb-2 leading-relaxed mt-4 sm:mt-8">
            {parseInline(firstParagraph)}
          </p>
        ) : null}
        {bullets.length ? (
          templateType === 'luxury_elite' ? (
            (() => {
              const years = bullets.find(
                (b) => /years?/i.test(b) && /business/i.test(b)
              );
              const sectors = bullets.find((b) =>
                /(education|office|offices|retail|healthcare)/i.test(b)
              );
              const satisfaction = bullets.find((b) =>
                /(satisfaction|100%)/i.test(b)
              );
              const serviceArea = bullets.find((b) =>
                /service\s*area/i.test(b)
              );
              return (
                <div className="sm:mt-10 mt-1 pb-6 flex flex-col items-center tk-bely">
                  {years ? (
                    <div className="flex flex-col items-center gap-2 text-[var(--color-primary)]">
                      <ShieldIcon className="sm:h-12 h-6 sm:w-12 w-6" />
                      <SplitLabel text={years} className="text-2xs" />
                    </div>
                  ) : null}
                  <div className="flex items-center sm:gap-[78px] gap-10">
                    <div className="relative sm:w-48 w-24 sm:h-48 h-24 rotate-45 bg-[var(--color-primary)]">
                      <div className="absolute inset-0 -rotate-45 flex flex-col items-center justify-center sm:p-6 p-2 text-white text-center">
                        <EductationIcon className="sm:h-12 h-6 sm:w-12 w-6" />
                        <div className="sm:text-lg text-2xs leading-relaxed">
                          {sectors
                            ? parseInline(sectors)
                            : parseInline(bullets[0])}
                        </div>
                      </div>
                    </div>
                    <div className="relative sm:w-48 w-24 sm:h-48 h-24 rotate-45 bg-[var(--color-primary)]">
                      <div className="absolute inset-0 -rotate-45 flex flex-col items-center justify-center sm:p-6 p-2 text-white text-center">
                        <StartIcon className="sm:h-12 h-6 sm:w-12 w-6" />
                        <div className="sm:text-xl text-2xs leading-relaxed">
                          {satisfaction ? (
                            <SplitLabel
                              text={satisfaction}
                              className="text-white text-xl"
                            />
                          ) : (
                            parseInline(bullets[1] ?? '')
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {serviceArea ? (
                    <div className="flex flex-col items-center gap-2 text-[var(--color-primary)]">
                      <LocationIcon className="sm:h-12 h-6 sm:w-12 w-6" />
                      <span className="sm:text-xl text-2xs text-[#383838]">
                        <SplitLabel text={serviceArea} className="text-xl" />
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })()
          ) : (
            <div className="mt-4 sm:mt-10 pb-4 sm:pb-6">
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                {bullets.slice(0, 2).map((b, i) => (
                  <Bullet key={`b1-${i}`} raw={b} />
                ))}
              </div>
              <div className="border-t border-gray-200" />
              <div className="grid grid-cols-2 divide-x">
                {bullets.slice(2).map((b, i) => (
                  <Bullet key={`b2-${i}`} raw={b} />
                ))}
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
