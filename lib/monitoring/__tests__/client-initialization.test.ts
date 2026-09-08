import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
jest.mock('@sentry/nextjs', () => ({ init: jest.fn(), captureRouterTransitionStart: jest.fn() }));
jest.mock('posthog-js', () => ({ __esModule: true, default: { init: jest.fn() } }));
jest.mock('@/lib/analytics/config', () => ({ isPostHogEnabled: true, postHogConfig: { key: 'qa', host: 'https://qa.local' } }));
jest.mock('../config', () => ({ isSentryEnabled: true, sentryConfig: { dsn: 'https://key@example.com/1', environment: 'develop', tracesSampleRate: 1 } }));
it('initializes client error monitoring before analytics can throw', () => {
  jest.mocked(posthog.init).mockImplementation(() => { throw new Error('Analytics unavailable'); });
  expect(() => jest.requireActual('../../../instrumentation-client')).toThrow('Analytics unavailable');
  expect(Sentry.init).toHaveBeenCalledWith({ dsn: 'https://key@example.com/1', environment: 'develop', tracesSampleRate: 1, sendDefaultPii: false, debug: false });
  expect(jest.mocked(Sentry.init).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(posthog.init).mock.invocationCallOrder[0]);
});
