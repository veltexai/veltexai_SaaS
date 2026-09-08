/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DemoCTA } from '../components/demo-cta';
import { DemoSignupModal } from '../components/demo-signup-modal';
import { buildDemoHandoff } from '../utils/build-demo-handoff';
import { signInWithGoogle } from '@/features/auth/actions/oauth';
import { AUTH_ROUTES } from '@/features/auth/constants';

jest.mock('@/lib/analytics', () => ({ ANALYTICS_EVENTS: {}, captureEvent: jest.fn() }));
jest.mock('@/features/auth/actions/oauth', () => ({ signInWithGoogle: jest.fn(async () => ({ error: { message: 'QA only' } })) }));
it.each(['residential_recurring', 'residential_deep_clean', 'move_out_turnover', 'residential_premium_detail'] as const)('keeps %s scope and design in both demo CTA paths', scope => {
  render(<DemoCTA demoType="residential" scopeTemplateId={scope} />);
  const redirect = buildDemoHandoff('residential', scope);
  expect(screen.getByRole('link', { name: 'Create My Real Proposal' })).toHaveAttribute('href', redirect);
  const signup = new URL(screen.getByRole('link', { name: 'Start Free Trial' }).getAttribute('href')!, 'https://qa.local');
  expect(signup.searchParams.get('redirect')).toBe(redirect);
  expect(new URL(redirect, signup).searchParams.get('designTemplateType')).toBe('luxury_elite');
});
it('uses one redirect for email signup, login, and Google', async () => {
  const redirectTo = buildDemoHandoff('commercial', 'commercial_office');
  render(<DemoSignupModal open onClose={jest.fn()} redirectTo={redirectTo} />);
  for (const name of ['Sign up with Email', 'I already have an account']) {
    const url = new URL(screen.getByRole('link', { name }).getAttribute('href')!, 'https://qa.local');
    expect(url.searchParams.get('redirect')).toBe(redirectTo);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledWith(undefined, redirectTo, 'signup'));
  expect(redirectTo.startsWith(AUTH_ROUTES.QUICK_PROPOSAL)).toBe(true);
});
