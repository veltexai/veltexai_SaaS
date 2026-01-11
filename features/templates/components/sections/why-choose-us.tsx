import React from 'react';
import { TemplateType } from '@/features/templates/types/templates';
import { dmSerifText } from '@/lib/fonts';
import {
  BookIcon,
  PriceChangeIcon,
  PlaylistCheckIcon,
  LeafSparkIcon,
  ThumbUpIcon,
} from '@/components/icons';
import ProposalTitle from '../shared/proposal-title';

interface WhyChooseUsProps {
  title: string;
  content: string;
  templateType: TemplateType;
  className?: string;
}

export default function WhyChooseUs({
  title,
  content,
  templateType,
  className = '',
}: WhyChooseUsProps) {
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
    if (l.includes('professional') || l.includes('teams')) return BookIcon;
    if (l.includes('transparent') || l.includes('pricing'))
      return PriceChangeIcon;
    if (
      l.includes('quality') ||
      l.includes('assurance') ||
      l.includes('walk') ||
      l.includes('logs')
    )
      return PlaylistCheckIcon;
    if (
      l.includes('eco') ||
      l.includes('conscious') ||
      l.includes('safe') ||
      l.includes('waste')
    )
      return LeafSparkIcon;
    if (
      l.includes('reliability') ||
      l.includes('backup') ||
      l.includes('coverage')
    )
      return ThumbUpIcon;
    return PlaylistCheckIcon;
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
          <p className="text-xs sm:text-sm text-[#383838] mb-4 leading-relaxed mt-8">
            {parseInline(firstParagraph)}
          </p>
        ) : null}
        <div className="mt-4 sm:mt-6">
          {bullets.map((b, i) => (
            <Bullet key={`wcu-${i}`} raw={b} />
          ))}
        </div>
      </div>
    </div>
  );
}
