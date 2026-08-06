const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// VERCEL_ENV is set automatically by Vercel: "production" | "preview" | "development".
const VERCEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;

export const isSentryEnabled = Boolean(SENTRY_DSN);

export const sentryConfig = {
  dsn: SENTRY_DSN,
  environment: VERCEL_ENV ?? process.env.NODE_ENV,
  // Sample every trace outside production; keep production light on quota.
  tracesSampleRate: VERCEL_ENV === "production" ? 0.1 : 1,
} as const;
