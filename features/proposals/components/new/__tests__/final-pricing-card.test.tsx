/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FinalPricingCard } from '../final-pricing-card';

it.each(['one-time', 'one_time'])('shows one-time labels for %s', serviceFrequency => {
  render(<FinalPricingCard basePrice={400} monthlyAddonsTotal={50} oneTimeAddons={[]} pricing={null} serviceFrequency={serviceFrequency} />);
  expect(screen.getByText('One-Time Total (Base + Add-ons)')).toBeInTheDocument();
  expect(screen.getByText('Base Service (One-Time):')).toBeInTheDocument();
  expect(screen.getByText('One-Time Add-ons:')).toBeInTheDocument();
  expect(screen.queryByText(/monthly/i)).not.toBeInTheDocument();
});
it('preserves recurring pricing labels', () => {
  render(<FinalPricingCard basePrice={400} monthlyAddonsTotal={50} oneTimeAddons={[]} pricing={null} serviceFrequency="weekly" />);
  expect(screen.getByText('Monthly Total (Base + Add-ons)')).toBeInTheDocument();
  expect(screen.getByText('Base Service (Monthly):')).toBeInTheDocument();
});
