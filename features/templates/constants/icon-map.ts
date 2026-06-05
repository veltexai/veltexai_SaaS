import React from 'react';
import {
  ExcellenceIcon,
  SatisfactionIcon,
  ReliabilityIcon,
  DetailIcon,
  TotalServiceIcon,
  PromptFollowUpIcon,
  ProblemResolutionIcon,
  PartnershipIcon,
  ShieldIcon,
  LocationIcon,
  StartIcon,
  EductationIcon,
} from '@/components/icons';

// Normalize labels to a simple slug for resilient matching
function slugify(label: string) {
  return label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type IconComponent = React.ComponentType<{
  className?: string;
  size?: number | string;
}>;

// Canonical mapping for deterministic label → icon resolution
export const BULLET_ICON_MAP: Record<string, IconComponent> = {
  excellence: ExcellenceIcon,
  '100-satisfaction': SatisfactionIcon,
  satisfaction: SatisfactionIcon,
  'professionalism-and-reliability': ReliabilityIcon,
  'guaranteed-professionalism-and-reliability': ReliabilityIcon,
  reliability: ReliabilityIcon,
  'attention-to-detail': DetailIcon,
  detail: DetailIcon,
  'total-service': TotalServiceIcon,
  'prompt-follow-up': PromptFollowUpIcon,
  // Long-form label from screenshot for deterministic mapping
  'should-a-problem-ever-exist-you-can-be-assured-it-will-be-promptly-handled':
    ProblemResolutionIcon,
  'problem-resolution': ProblemResolutionIcon,
  '10-years-in-business': ShieldIcon,
  'years-in-business': ShieldIcon,
  'washington-service-area': LocationIcon,
  'service-area': LocationIcon,
  'education-offices-retail-healthcare': EductationIcon,
  'education-offices-retail-and-healthcare': EductationIcon,
};

export function getIconForLabel(label: string): IconComponent | null {
  const key = slugify(label);
  const exact = BULLET_ICON_MAP[key];
  if (exact) return exact;
  const l = label.toLowerCase();
  if (/\bservice\s+area\b/.test(l)) return LocationIcon;
  if (/years?/.test(l) && /business/.test(l)) return ShieldIcon;
  if (/(education|office|offices|retail|healthcare)/.test(l)) return EductationIcon;
  if (/(satisfaction|100%)/.test(l)) return StartIcon;
  return null;
}
