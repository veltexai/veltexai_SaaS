import { captureProposalFailure } from '../proposal-errors';
import * as Sentry from '@sentry/nextjs';

const scope = { clearBreadcrumbs: jest.fn(), setTags: jest.fn() };
jest.mock('../config', () => ({ isSentryEnabled: true }));
jest.mock('@sentry/nextjs', () => ({ withScope: jest.fn(), captureException: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Sentry.withScope).mockImplementation(((callback: (s: typeof scope) => void) => callback(scope)) as unknown as typeof Sentry.withScope);
});
it.each([400, 401, 403, 422, 429])('ignores expected HTTP %s rejections', status => {
  captureProposalFailure('quick', 'save', status);
  expect(Sentry.captureException).not.toHaveBeenCalled();
});
it.each([undefined, 200, 500, 503])('captures unexpected failures with safe metadata (%s)', status => {
  captureProposalFailure('quick', 'generate', status);
  expect(scope.clearBreadcrumbs).toHaveBeenCalled();
  expect(scope.setTags).toHaveBeenCalledWith({ flow: 'quick', action: 'generate', status_code: status ?? 'network' });
  expect(Sentry.captureException).toHaveBeenCalledWith(new Error('Proposal generate failed'));
});
it('never lets telemetry errors break proposal creation', () => {
  jest.mocked(Sentry.withScope).mockImplementation(() => { throw new Error('SDK unavailable'); });
  expect(() => captureProposalFailure('advanced', 'save')).not.toThrow();
});
