import {
  CRM_PIPELINE_TEMPLATE_KEYS,
  CRM_STAGE_CATEGORIES,
  aggregatePipelineValues,
  crmRoleHasPermission,
  evaluateStageGate,
} from '../domain';

const baseGate = {
  hasProperty: true,
  hasScheduledWalkthrough: true,
  templateSkipsWalkthrough: false,
  hasLinkedSentProposal: true,
  manualWinReason: 'Customer confirmed by phone; owner recorded manual outcome.',
};

describe('R3-1 CRM domain contract', () => {
  it('freezes the eleven canonical categories and both starter templates', () => {
    expect(CRM_STAGE_CATEGORIES).toEqual([
      'new', 'qualifying', 'walkthrough', 'estimating', 'proposing', 'negotiating',
      'won', 'handed_off', 'lost', 'disqualified', 'nurture',
    ]);
    expect(CRM_PIPELINE_TEMPLATE_KEYS).toEqual([
      'commercial_facility_v1',
      'residential_turnover_v1',
    ]);
  });

  it('maps management and estimator permissions without inventing sales_manager', () => {
    expect(crmRoleHasPermission('owner', 'crm:pipeline_configure')).toBe(true);
    expect(crmRoleHasPermission('admin', 'crm:mark_won_manual')).toBe(true);
    expect(crmRoleHasPermission('estimator', 'crm:stage_move_assigned')).toBe(true);
    expect(crmRoleHasPermission('estimator', 'crm:assign')).toBe(false);
    expect(crmRoleHasPermission('viewer', 'crm:create')).toBe(false);
  });

  it('blocks stages whose owned-data gates are unmet', () => {
    expect(evaluateStageGate('walkthrough', { ...baseGate, hasScheduledWalkthrough: false }))
      .toEqual({ allowed: false, reason: 'Schedule a walkthrough before moving to this stage.' });
    expect(evaluateStageGate('estimating', { ...baseGate, hasProperty: false }))
      .toEqual({ allowed: false, reason: 'Link a property before estimating.' });
    expect(evaluateStageGate('proposing', { ...baseGate, hasLinkedSentProposal: false }))
      .toEqual({ allowed: false, reason: 'Link a sent proposal before moving to this stage.' });
    expect(evaluateStageGate('won', { ...baseGate, manualWinReason: '  ' }))
      .toEqual({ allowed: false, reason: 'A manual win requires a reason.' });
    expect(evaluateStageGate('handed_off', baseGate)).toEqual({
      allowed: false,
      reason: 'Handoff becomes available in the reviewed R3-6 workflow.',
    });
  });

  it('allows estimating without a walkthrough only for a template that skips it', () => {
    expect(evaluateStageGate('estimating', {
      ...baseGate,
      hasScheduledWalkthrough: false,
      templateSkipsWalkthrough: true,
    })).toEqual({ allowed: true });
  });

  it('keeps pipeline totals separate by currency and pricing basis', () => {
    expect(aggregatePipelineValues([
      { amountMinor: 10000, currency: 'usd', basis: 'monthly' },
      { amountMinor: 2500, currency: 'USD', basis: 'monthly' },
      { amountMinor: 40000, currency: 'USD', basis: 'one_time' },
    ])).toEqual({
      'USD:monthly': { amountMinor: 12500, currency: 'USD', basis: 'monthly' },
      'USD:one_time': { amountMinor: 40000, currency: 'USD', basis: 'one_time' },
    });
  });

  it('refuses invalid minor-unit values instead of silently rounding', () => {
    expect(() => aggregatePipelineValues([
      { amountMinor: 10.5, currency: 'USD', basis: 'monthly' },
    ])).toThrow('Pipeline values must use non-negative integer minor units.');
  });
});
