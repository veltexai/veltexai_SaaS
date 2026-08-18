import {
  deriveScopeTemplateId,
  resolveServicePhotos,
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

describe('resolveServicePhotos', () => {
  const photo = (over: Record<string, unknown>) =>
    over as unknown as Pick<Proposal, 'id' | 'title' | 'service_type'>;

  const slots = (images: Record<string, string | undefined>) => [
    images.tocImage,
    images.aboutImage,
    images.qualificationsImage,
    images.thankYouImage,
  ];

  it('draws every photo from the commercial folder', () => {
    const images = resolveServicePhotos(
      photo({ id: 'a3f1c0de-0000-4000-8000-000000000001', service_type: 'commercial' })
    )!;
    expect(images).toBeDefined();
    for (const src of Object.values(images)) {
      expect(src).toMatch(/^\/images\/templates\/commercial\//);
    }
  });

  it('draws every photo from the residential folder', () => {
    const images = resolveServicePhotos(
      photo({ id: 'b7d2e1af-0000-4000-8000-000000000002', service_type: 'residential' })
    )!;
    expect(images).toBeDefined();
    for (const src of Object.values(images)) {
      expect(src).toMatch(/^\/images\/templates\/residential\//);
    }
  });

  it('reserves the cover-prefixed photos for the cover slots', () => {
    for (let i = 0; i < 20; i += 1) {
      const images = resolveServicePhotos(
        photo({ id: `seed-${i}`, service_type: 'commercial' })
      )!;
      expect(images.coverImage).toMatch(/\/C0[12]-cover-/);
      // Nothing renders both cover slots, so they intentionally share a photo.
      expect(images.coverMask).toBe(images.coverImage);
    }
  });

  it('uses the closing photo for the residential thank-you page', () => {
    const images = resolveServicePhotos(
      photo({ id: 'anything', service_type: 'residential' })
    )!;
    expect(images.thankYouImage).toBe(
      '/images/templates/residential/R10-closing-armchair.png'
    );
  });

  it('falls back to the general pool when no closing photo exists', () => {
    const images = resolveServicePhotos(
      photo({ id: 'anything', service_type: 'commercial' })
    )!;
    expect(images.thankYouImage).toMatch(/^\/images\/templates\/commercial\/C\d\d-/);
    expect(images.thankYouImage).not.toMatch(/-cover-/);
  });

  it('is deterministic — the preview and the printed PDF must agree', () => {
    const proposal = photo({
      id: 'c9e4f2ba-0000-4000-8000-000000000003',
      service_type: 'commercial',
    });
    expect(resolveServicePhotos(proposal)).toEqual(
      resolveServicePhotos(proposal)
    );
  });

  it('varies the photo set across proposals', () => {
    const sets = new Set(
      Array.from({ length: 12 }, (_, i) =>
        JSON.stringify(
          resolveServicePhotos(
            photo({ id: `proposal-${i}`, service_type: 'residential' })
          )
        )
      )
    );
    expect(sets.size).toBeGreaterThan(1);
  });

  it('never repeats a photo within one proposal', () => {
    for (const service_type of ['commercial', 'residential']) {
      for (let i = 0; i < 20; i += 1) {
        const images = resolveServicePhotos(
          photo({ id: `dupe-${i}`, service_type })
        )!;
        const used = slots(images as Record<string, string | undefined>);
        expect(new Set(used).size).toBe(used.length);
      }
    }
  });

  it('falls back to the title, then to a constant seed, when id is empty', () => {
    expect(
      resolveServicePhotos(
        photo({ id: '', title: 'Acme Office', service_type: 'commercial' })
      )
    ).toBeDefined();
    expect(() =>
      resolveServicePhotos(photo({ id: '', service_type: 'commercial' }))
    ).not.toThrow();
  });

  it('returns undefined for service types with no folder yet', () => {
    for (const service_type of ['carpet', 'window', 'floor']) {
      expect(resolveServicePhotos(photo({ id: 'x', service_type }))).toBeUndefined();
    }
    expect(resolveServicePhotos(photo({ id: 'x' }))).toBeUndefined();
  });
});

describe('resolveTemplateImages', () => {
  it('prefers service photos over the legacy scope art', () => {
    const images = resolveTemplateImages(
      base({
        id: 'd1a8b3cf-0000-4000-8000-000000000004',
        service_type: 'residential',
        service_specific_data: { scope_template_id: 'move_out_turnover' },
      }),
      'luxury_elite'
    )!;
    expect(images.aboutImage).toMatch(/^\/images\/templates\/residential\//);
  });

  it('still falls through to the scope art for folderless service types', () => {
    const images = resolveTemplateImages(
      base({ id: 'x', service_type: 'window' }),
      'luxury_elite'
    );
    expect(images).toEqual({
      coverMask: '/images/templates/Images/premium_detail_one.png',
      tocImage: '/images/templates/Images/premium_detail_two.png',
      aboutImage: '/images/templates/Images/premium_detail_three.png',
      qualificationsImage: '/images/templates/Images/premium_detail_four.png',
    });
  });

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
