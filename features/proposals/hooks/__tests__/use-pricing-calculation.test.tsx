/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import type { ReactNode } from 'react';
import { usePricingCalculation } from '../use-pricing-calculation';
import type { ProposalFormData } from '../../schemas/proposal';

jest.mock('@/hooks/use-pricing-settings', () => ({ usePricingSettings: () => ({ settings: null }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const quote = {
  price_range: { low: 315.72, high: 315.72 }, hours_estimate: { min: 2, max: 2 },
  assumptions: { labor_rate: 35, overhead_percentage: 15, margin_percentage: 25, production_rate: { min: 800, max: 800 } },
};
let form: UseFormReturn<ProposalFormData>;
function Wrapper({ children }: { children: ReactNode }) {
  form = useForm<ProposalFormData>({ defaultValues: {
    service_type: 'residential', global_inputs: { facility_size: 1500, service_frequency: 'one-time' },
    service_specific_data: { scope_template_id: 'residential_deep_clean' }, pricing_data: quote,
    service_scope: { areas_included: ['Bedroom'], frequency_details: { Bedroom: 'one_time' } },
  } });
  return <FormProvider {...form}>{children}</FormProvider>;
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('does not reprice a saved Quick quote on mount or rerender', async () => {
  const { result, rerender } = renderHook(() => usePricingCalculation({ serviceType: 'residential', enabled: true, proposalId: 'saved', existingPricingData: quote, onEnabledChange: jest.fn() }), { wrapper: Wrapper });
  rerender();
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(result.current.calculatedPricing).toEqual(quote);
  expect(form.getValues('pricing_data')).toEqual(quote);
});

it('still recalculates when the user changes a pricing input', async () => {
  const { result } = renderHook(() => usePricingCalculation({ serviceType: 'residential', enabled: true, proposalId: 'saved', existingPricingData: quote, onEnabledChange: jest.fn() }), { wrapper: Wrapper });
  act(() => form.setValue('global_inputs.facility_size', 2000));
  await act(async () => { jest.advanceTimersByTime(1100); });
  expect(result.current.calculatedPricing).not.toEqual(quote);
  expect(form.getValues('pricing_data')).toEqual(result.current.calculatedPricing);
});
