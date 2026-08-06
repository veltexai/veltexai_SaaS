// Sentry initialization for the Node.js runtime.
// Loaded from instrumentation.ts — do not import this file anywhere else.
import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled, sentryConfig } from "@/lib/monitoring/config";

if (isSentryEnabled) {
  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    tracesSampleRate: sentryConfig.tracesSampleRate,

    // Request bodies here carry customer proposal data and Stripe webhook
    // payloads, so never let Sentry attach IPs, cookies, or bodies.
    sendDefaultPii: false,

    // Next.js uses thrown errors for redirect()/notFound() control flow.
    ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND"],

    debug: false,
  });
}
