import { TemplateType, ProposalTemplateRow } from '../types/templates';

export function detectTemplateType(
  t?: ProposalTemplateRow | null
): TemplateType {
  const name = t?.name?.toLowerCase() ?? '';
  if (name.includes('executive') || name.includes('premium'))
    return 'executive_premium';
  if (name.includes('modern') || name.includes('corporate'))
    return 'modern_corporate';
  if (name.includes('luxury') || name.includes('elite')) return 'luxury_elite';
  if (t?.template_type === 'basic') return 'basic';
  return 'executive_premium';
}

export function splitTitleWithAmpersand(
  title: string,
  templateType: TemplateType
): {
  first: string;
  second: string;
} {
  const t = title.trim();
  const idx = t.lastIndexOf('&');
  if (idx >= 0) {
    const first = t.slice(0, idx).trimEnd();
    const second = t.slice(idx).trim();
    return { first, second };
  }
  const parts = t.split(/\s+/);
  if (parts.length === 0) return { first: '', second: '' };
  const firstDefault = parts.slice(0, -1).join(' ');
  const secondDefault = parts.slice(-1)[0] ?? '';
  if (
    templateType !== 'executive_premium' &&
    firstDefault.toLowerCase() === 'why choose'
  ) {
    const m = t.match(/^\s*(\S+)\s+([\s\S]*)$/);
    if (m) return { first: m[1].toLowerCase(), second: m[2] };
  }
  return { first: firstDefault, second: secondDefault };
}

/**
 * Splits a label into { top, bottom }.
 *
 * Rules:
 * - Default: bottom = last word, top = everything before it.
 * - Special case: if the label ends with "service area", treat that as the entire bottom.
 */
export function splitLastWordOrServiceArea(raw: string): {
  top: string;
  bottom: string;
} {
  const text = raw.trim();
  if (!text) return { top: '', bottom: '' };

  const SERVICE_AREA = 'service area';
  const lower = text.toLowerCase();

  // Special case: "service area"
  if (lower.endsWith(SERVICE_AREA)) {
    const idx = lower.lastIndexOf(SERVICE_AREA);
    return {
      top: text.slice(0, idx).trim(),
      bottom: text.slice(idx).trim(),
    };
  }

  // Default case: split by last word
  const words = text.split(/\s+/);

  // Single word: nothing to split
  if (words.length === 1) {
    return { top: text, bottom: '' };
  }

  const bottom = words.pop()!; // last word
  const top = words.join(' ');

  return { top, bottom };
}
