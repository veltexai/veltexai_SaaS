import React from 'react';
import { TemplateType } from '@/features/templates/types/templates';
import { dmSerifText } from '@/lib/fonts';
import {
  AddTaskIcon,
  AccountBalanceIcon,
  CircleNotificationIcon,
  LockIcon,
} from '@/components/icons';
import ProposalTitle from '../shared/proposal-title';

interface OurCommitementProps {
  title: string;
  content: string;
  templateType: TemplateType;
  className?: string;
}

export default function OurCommitement({
  title,
  content,
  templateType,
  className = '',
}: OurCommitementProps) {
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

  const resolveIconComponent = (raw: string) => {
    const l = raw.toLowerCase();
    if (l.includes('quality') || l.includes('inspection')) return AddTaskIcon;
    if (
      l.includes('trained') ||
      l.includes('sop') ||
      l.includes('safety') ||
      l.includes('protocol') ||
      l.includes('teams')
    )
      return AccountBalanceIcon;
    if (l.includes('prompt') || l.includes('request') || l.includes('incident'))
      return CircleNotificationIcon;
    if (
      l.includes('secure') ||
      l.includes('confidential') ||
      l.includes('access')
    )
      return LockIcon;
    return AddTaskIcon;
  };

  const Bullet = ({ raw }: { raw: string }) => {
    const Icon = resolveIconComponent(raw);
    return (
      <div className="flex items-start gap-4 sm:py-2 py-1">
        <Icon className="h-4 sm:h-7 w-4 sm:w-7 flex-shrink-0 text-[var(--color-primary)]" />
        <div className="text-[#383838] leading-relaxed text-[10px] sm:text-sm">
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
          <p className="text-xs sm:text-sm text-[#383838] sm:mb-4 mb-2 leading-relaxed sm:mt-8 mt-2">
            {parseInline(firstParagraph)}
          </p>
        ) : null}
        <h3 className={`sm:text-2xl text-xl italic sm:mt-8 mt-4 mb-2 ${dmSerifText.className}`}>
          Service Values
        </h3>
        <div className="mt-2">
          {bullets.map((b, i) => (
            <Bullet key={`sv-${i}`} raw={b} />
          ))}
        </div>
      </div>
    </div>
  );
}
