import React from 'react';
import { TemplateType } from '@/features/templates/types/templates';
import { dmSerifText } from '@/lib/fonts';

interface NotesProps {
  title: string;
  content: string;
  templateType: TemplateType;
  className?: string;
}

export default function Notes({
  title,
  content,
  templateType,
  className = '',
}: NotesProps) {
  const lines = (content ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const items = lines
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, ''));

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

  return (
    <div>
      <div className={className}>
        <h3
          className={`sm:text-xl text-lg italic sm:mt-8 mt-4 mb-4 ${
            templateType === 'luxury_elite' ? 'kt-bely' : dmSerifText.className
          }`}
        >
          {title || 'Notes'}
        </h3>
        <ul className="space-y-2 text-[#383838]">
          {items.map((it, i) => (
            <li key={`note-${i}`} className="list-disc ml-5 sm:text-xs text-2xs">
              {parseInline(it)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
