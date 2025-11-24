import React from 'react';
import { TemplateType } from '@/features/templates/types/templates';
import { arvo, dmSerifText } from '@/lib/fonts';
import Image from 'next/image';

interface AddonsProps {
  title: string;
  content: string;
  templateType: TemplateType;
  className?: string;
}

export default function Addons({
  title,
  content,
  templateType,
  className = '',
}: AddonsProps) {
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

  const Bullet = ({ raw }: { raw: string }) => {
    return (
      <div
        className={`flex items-center justify-center gap-4 p-3 border border-[var(--color-primary)] ${
          templateType === 'luxury_elite' ? 'rounded-none' : 'rounded-3xl'
        }`}
      >
        <div className="text-[var(--color-primary)] font-bold text-center leading-relaxed text-sm">
          {parseInline(raw)}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className={className}>
        {firstParagraph ? (
          <p
            className={`text-2xl text-[var(--color-primary)] mb-4 leading-relaxed mt-8 italic ${
              templateType === 'luxury_elite'
                ? 'tk-bely'
                : dmSerifText.className
            }`}
          >
            {parseInline(firstParagraph)}
          </p>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-4">
          {bullets.map((b, i) => (
            <Bullet key={`addons-${i}`} raw={b} />
          ))}
        </div>
      </div>
    </div>
  );
}
