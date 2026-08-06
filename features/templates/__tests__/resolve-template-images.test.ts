import {
  deriveScopeTemplateId,
  resolveTemplateImages,
} from '@/features/templates/utils/resolve-template-images';
import type { Proposal } from '@/features/templates/types/templates';

const base = (over: Record<string, unknown>) => over as unknown as Proposal;

describe('deriveScopeTemplateId', () => {
  it('prefers the persisted quick-flow key', () => {
    expect(
      deriveScopeTemplateId({
        service_type: 'commercial',
        service_specific_data: { scope_template_id: 'move_out_turnover' },
        facility_details: { building_type: 'office' },
      })
    ).toBe('move_out_turnover');
  });

  it('ignores a bogus persisted key and falls through', () => {
    expect(
      deriveScopeTemplateId({
        service_type: 'commercial',
        service_specific_data: { scope_template_id: 'not_a_scope' },
        facility_details: { building_type: 'medical' },
      })
    ).toBe('medical_office');
  });

  it('derives from building_type (advanced flow)', () => {
    expect(
      deriveScopeTemplateId({
        service_type: 'residential',
        facility_details: { building_type: 'house' },
      })
    ).toBe('move_out_turnover');
  });

  it('derives from service_type when no building_type', () => {
    expect(deriveScopeTemplateId({ service_type: 'window' })).toBe(
      'window_cleaning_add_on'
    );
  });

  it('defaults for an empty/legacy proposal', () => {
    expect(deriveScopeTemplateId({})).toBe('commercial_office');
    expect(
      deriveScopeTemplateId({ service_specific_data: null, facility_details: 'x' })
    ).toBe('commercial_office');
  });
});

describe('resolveTemplateImages', () => {
  it('returns the bespoke luxury set for a turnover proposal', () => {
    const images = resolveTemplateImages(
      base({ service_specific_data: { scope_template_id: 'move_out_turnover' } }),
      'luxury_elite'
    );
    expect(images).toEqual({
      coverMask: '/images/templates/Images/move_in_out_one.png',
      tocImage: '/images/templates/Images/move_in_out_two.png',
      aboutImage: '/images/templates/Images/move_in_out_three.png',
      qualificationsImage: '/images/templates/Images/move_in_out_four.png',
    });
  });

  it('returns undefined for non-luxury families (no rectangular art yet)', () => {
    const p = base({
      service_specific_data: { scope_template_id: 'move_out_turnover' },
    });
    expect(resolveTemplateImages(p, 'executive_premium')).toBeUndefined();
    expect(resolveTemplateImages(p, 'modern_corporate')).toBeUndefined();
    expect(resolveTemplateImages(p, 'basic')).toBeUndefined();
  });

  it('returns undefined for scopes with no bespoke art', () => {
    expect(
      resolveTemplateImages(
        base({ service_specific_data: { scope_template_id: 'commercial_office' } }),
        'luxury_elite'
      )
    ).toBeUndefined();
  });
});
