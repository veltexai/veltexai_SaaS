const originalEnv = process.env;
afterEach(() => { process.env = originalEnv; });
it.each([['production', 0.1], ['preview', 1], ['develop', 1], ['development', 1]])('uses the same public %s environment in the browser', (environment, rate) => {
  process.env = { ...originalEnv, NEXT_PUBLIC_SENTRY_ENVIRONMENT: String(environment), NEXT_PUBLIC_SENTRY_DSN: 'https://key@example.com/1' };
  jest.isolateModules(() => {
    const { sentryConfig, isSentryEnabled } = jest.requireActual('../config');
    expect(isSentryEnabled).toBe(true);
    expect(sentryConfig.environment).toBe(environment);
    expect(sentryConfig.tracesSampleRate).toBe(rate);
  });
});
it('stays disabled without a public DSN', () => {
  process.env = { ...originalEnv, NEXT_PUBLIC_SENTRY_DSN: '' };
  jest.isolateModules(() => expect(jest.requireActual('../config').isSentryEnabled).toBe(false));
});
