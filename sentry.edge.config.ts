// Sentry initialization for the Edge runtime (middleware runs here).
// Loaded from instrumentation.ts — do not import this file anywhere else.
import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled, sentryConfig } from "@/lib/monitoring/config";

if (isSentryEnabled) {
  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    tracesSampleRate: sentryConfig.tracesSampleRate,

    sendDefaultPii: false,

    ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND"],

    debug: false,
  });
}
