/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import type { ProposalFormData } from '@/features/proposals/schemas/proposal';
import { ServiceTypeSelector } from '../service-type-selector';

function Harness({ onSelect, showTitle = false }: { onSelect: jest.Mock; showTitle?: boolean }) {
  const form = useForm<ProposalFormData>({ defaultValues: { service_type: 'residential' } });
  return <Form {...form}><ServiceTypeSelector onSelect={onSelect} showTitle={showTitle} /></Form>;
}

it.each([
  ['Residential Cleaning', 'residential'], ['Commercial Cleaning', 'commercial'],
  ['Carpet Cleaning', 'carpet'], ['Window Cleaning', 'window'], ['Floor Care', 'floor'],
])('advances %s exactly once, including the preselected card', (label, type) => {
  const onSelect = jest.fn();
  render(<Harness onSelect={onSelect} />);
  fireEvent.click(screen.getByText(label));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(type);
  expect(screen.queryByLabelText('Proposal Title *')).not.toBeInTheDocument();
});

it('retains the title field for existing edit consumers', () => {
  render(<Harness onSelect={jest.fn()} showTitle />);
  expect(screen.getByLabelText('Proposal Title *')).toBeInTheDocument();
});
