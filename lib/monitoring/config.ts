const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// next.config.ts exposes Vercel's environment at build time for browser parity.
const environment =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
  process.env.NEXT_PUBLIC_VERCEL_ENV ??
  process.env.VERCEL_ENV ??
  process.env.NODE_ENV;

export const isSentryEnabled = Boolean(SENTRY_DSN);

export const sentryConfig = {
  dsn: SENTRY_DSN,
  environment,
  // Sample every trace outside production; keep production light on quota.
  tracesSampleRate: environment === "production" ? 0.1 : 1,
} as const;
