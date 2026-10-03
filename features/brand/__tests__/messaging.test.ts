import {
  BRAND_TRUST_POINTS,
  BRAND_VALIDATION_VARIANTS,
  VELTEX_BRAND,
  brandVariant,
  findProhibitedBrandClaim,
} from '../messaging';

describe('Veltex brand messaging contract', () => {
  it('keeps the master and operational identities distinct', () => {
    expect(VELTEX_BRAND).toMatchObject({
      masterBrand: 'Veltex',
      operationalBrand: 'Veltex AI',
      domain: 'veltexai.com',
      category: 'The cleaning business operating system',
    });
  });

  it('pins the three comparable validation variants', () => {
    expect(Object.keys(BRAND_VALIDATION_VARIANTS)).toEqual(['A', 'B', 'C']);
    expect(brandVariant('A').headline).toBe('Veltex AI');
    expect(brandVariant('B').headline).toBe('Veltex');
    expect(brandVariant('C').category).toContain('AI-Assisted Estimating');
  });

  it('preserves operator control and the manual fallback in the trust contract', () => {
    expect(BRAND_TRUST_POINTS.join(' ')).toMatch(/control the scope, price, and final decision/i);
    expect(BRAND_TRUST_POINTS.join(' ')).toMatch(/Manual workflows remain available/i);
  });

  it.each([
    'Perfect AI pricing for every job',
    'Guaranteed profit for your company',
    'The AI that runs your cleaning company',
    'Fully automated business management',
  ])('refuses prohibited positioning: %s', (copy) => {
    expect(findProhibitedBrandClaim(copy)).not.toBeNull();
  });

  it('allows the approved benefit-led direction', () => {
    expect(findProhibitedBrandClaim(
      'Veltex helps organize walkthrough evidence while your team controls scope and price.',
    )).toBeNull();
  });
});
