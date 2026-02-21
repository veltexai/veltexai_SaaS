export const parseInline = (text: string) => {
  const parts: React.ReactNode[] = [];
  let idx = 0;
  const re = /(\*\*|__)(.*?)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > idx) parts.push(text.slice(idx, m.index));
    parts.push(
      <strong key={`b-${m.index}`} className="font-semibold text-gray-900">
        {m[2]}
      </strong>,
    );
    idx = m.index + m[0].length;
  }
  if (idx < text.length) parts.push(text.slice(idx));
  return parts.length ? parts : text;
};
