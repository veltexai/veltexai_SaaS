import type { OrganizationRole } from '@/features/organizations/domain';

export const CRM_STAGE_CATEGORIES = [
  'new',
  'qualifying',
  'walkthrough',
  'estimating',
  'proposing',
  'negotiating',
  'won',
  'handed_off',
  'lost',
  'disqualified',
  'nurture',
] as const;

export type CrmStageCategory = (typeof CRM_STAGE_CATEGORIES)[number];

export const CRM_PIPELINE_TEMPLATE_KEYS = [
  'commercial_facility_v1',
  'residential_turnover_v1',
] as const;

export type CrmPipelineTemplateKey = (typeof CRM_PIPELINE_TEMPLATE_KEYS)[number];

export const CRM_LEAD_STATUSES = [
  'new',
  'contacted',
  'converted',
  'junk',
  'merged',
  'disqualified',
] as const;

export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number];

export const CRM_PACKAGE_STATUSES = [
  'scoping',
  'walkthrough_scheduled',
  'estimated',
  'proposed',
  'accepted',
  'declined',
] as const;

export type CrmPackageStatus = (typeof CRM_PACKAGE_STATUSES)[number];

export type CrmPermission =
  | 'crm:read'
  | 'crm:create'
  | 'crm:edit_assigned'
  | 'crm:assign'
  | 'crm:stage_move_assigned'
  | 'crm:mark_won_manual'
  | 'crm:pipeline_configure';

const CRM_ROLE_PERMISSIONS = {
  owner: [
    'crm:read',
    'crm:create',
    'crm:edit_assigned',
    'crm:assign',
    'crm:stage_move_assigned',
    'crm:mark_won_manual',
    'crm:pipeline_configure',
  ],
  admin: [
    'crm:read',
    'crm:create',
    'crm:edit_assigned',
    'crm:assign',
    'crm:stage_move_assigned',
    'crm:mark_won_manual',
    'crm:pipeline_configure',
  ],
  estimator: ['crm:read', 'crm:create', 'crm:edit_assigned', 'crm:stage_move_assigned'],
  viewer: ['crm:read'],
} as const satisfies Record<OrganizationRole, readonly CrmPermission[]>;

export function crmRoleHasPermission(role: OrganizationRole, permission: CrmPermission): boolean {
  return (CRM_ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

export type StageGateContext = {
  hasProperty: boolean;
  hasScheduledWalkthrough: boolean;
  templateSkipsWalkthrough: boolean;
  hasLinkedSentProposal: boolean;
  manualWinReason?: string | null;
};

export type StageGateResult = { allowed: true } | { allowed: false; reason: string };

export function evaluateStageGate(
  target: CrmStageCategory,
  context: StageGateContext,
): StageGateResult {
  if (target === 'walkthrough' && !context.hasScheduledWalkthrough) {
    return { allowed: false, reason: 'Schedule a walkthrough before moving to this stage.' };
  }

  if (target === 'estimating' && !context.hasProperty) {
    return { allowed: false, reason: 'Link a property before estimating.' };
  }

  if (
    target === 'estimating' &&
    !context.templateSkipsWalkthrough &&
    !context.hasScheduledWalkthrough
  ) {
    return { allowed: false, reason: 'Schedule a walkthrough before estimating.' };
  }

  if ((target === 'proposing' || target === 'negotiating') && !context.hasLinkedSentProposal) {
    return { allowed: false, reason: 'Link a sent proposal before moving to this stage.' };
  }

  if (target === 'won' && !context.manualWinReason?.trim()) {
    return { allowed: false, reason: 'A manual win requires a reason.' };
  }

  if (target === 'handed_off') {
    return { allowed: false, reason: 'Handoff becomes available in the reviewed R3-6 workflow.' };
  }

  return { allowed: true };
}

export type PipelineValue = {
  amountMinor: number;
  currency: string;
  basis: string;
};

export function aggregatePipelineValues(
  values: readonly PipelineValue[],
): Record<string, { amountMinor: number; currency: string; basis: string }> {
  return values.reduce<Record<string, { amountMinor: number; currency: string; basis: string }>>(
    (totals, value) => {
      if (!Number.isSafeInteger(value.amountMinor) || value.amountMinor < 0) {
        throw new Error('Pipeline values must use non-negative integer minor units.');
      }
      const key = `${value.currency.toUpperCase()}:${value.basis}`;
      const existing = totals[key];
      totals[key] = {
        amountMinor: (existing?.amountMinor ?? 0) + value.amountMinor,
        currency: value.currency.toUpperCase(),
        basis: value.basis,
      };
      return totals;
    },
    {},
  );
}

