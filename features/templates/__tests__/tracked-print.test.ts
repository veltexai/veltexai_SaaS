import {
  normalizeTrackedColor,
  normalizeTrackedExtras,
} from '@/features/templates/utils/tracked-print';

describe('tracked print presentation mapping', () => {
  it('preserves customer-visible extras and derives recurring monthly display', () => {
    expect(
      normalizeTrackedExtras([
        { service: 'Carpet extraction', frequency: 'quarterly', subtotal: 300 },
        { service: 'Windows', frequency: 'one_time', subtotal: '125.50' },
      ])
    ).toEqual([
      {
        service: 'Carpet extraction',
        pricePerTime: '$300.00',
        pricePerMonth: '$100.00',
      },
      {
        service: 'Windows',
        pricePerTime: '$125.50',
        pricePerMonth: null,
      },
    ]);
  });

  it('accepts only six-digit hex colors for the Chromium style boundary', () => {
    expect(normalizeTrackedColor('#12aBcF', '#000000')).toBe('#12aBcF');
    expect(normalizeTrackedColor('red; background:url(https://bad)', '#000000')).toBe('#000000');
  });
});
