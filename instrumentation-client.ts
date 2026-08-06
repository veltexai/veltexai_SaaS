import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";
import { isPostHogEnabled, postHogConfig } from "@/lib/analytics/config";
import { isSentryEnabled, sentryConfig } from "@/lib/monitoring/config";

if (isPostHogEnabled && postHogConfig.key && postHogConfig.host) {
  posthog.init(postHogConfig.key, {
    api_host: postHogConfig.host,
    defaults: "2026-05-30",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_surveys: true,
    disable_session_recording: true,
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: ".ph-no-capture",
      recordHeaders: false,
      recordBody: false,
      strictMinimumDuration: true,
      maskCapturedNetworkRequestFn(request) {
        if (request.name) {
          request.name = request.name.split("?")[0];
        }
        return request;
      },
    },
  });
}

if (isSentryEnabled) {
  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    tracesSampleRate: sentryConfig.tracesSampleRate,

    // No replayIntegration on purpose: PostHog already records sessions above.
    sendDefaultPii: false,

    debug: false,
  });
}

// Required by the App Router so Sentry can trace client-side navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
