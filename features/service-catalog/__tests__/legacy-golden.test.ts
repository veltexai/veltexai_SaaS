import fs from 'fs';
import { PricingEngine, PricingCalculationInput } from '@/features/proposals/services/pricing-engine';
import { getScopeTemplate } from '@/features/proposals/quick/constants/scope-templates';
const golden = JSON.parse(fs.readFileSync('quality/service-catalog-remediation/legacy-golden.json', 'utf8'));
it.each(golden.services as Array<{ input: PricingCalculationInput; expected: unknown }>)('keeps the a4deb7c $input.serviceType pricing baseline', ({ input, expected }: { input: PricingCalculationInput; expected: unknown }) => {
  expect(new PricingEngine(golden.settings).calculatePricing(input)).toEqual(expected);
});
it.each(golden.templates as Array<{ id: string }>)('keeps the a4deb7c $id scope baseline', (template: { id: string }) => {
  expect(getScopeTemplate(template.id)).toEqual(template);
});
