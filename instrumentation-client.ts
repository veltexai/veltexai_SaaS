import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";
import { isPostHogEnabled, postHogConfig } from "@/lib/analytics/config";
import { isSentryEnabled, sentryConfig } from "@/lib/monitoring/config";

const bearerFragment = /#[A-Za-z0-9_-]{43}(?=$|[?&/\s])/g;

function redactBearerFragments<T>(value: T): T {
  if (typeof value === "string") return value.replace(bearerFragment, "#[redacted]") as T;
  if (Array.isArray(value)) return value.map(redactBearerFragments) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) =>
      [key, redactBearerFragments(entry)])) as T;
  }
  return value;
}

// Initialize error monitoring before analytics so analytics cannot block it.
if (isSentryEnabled) {
  Sentry.init({
    ...sentryConfig,
    sendDefaultPii: false,
    debug: false,
    beforeBreadcrumb: (breadcrumb) => redactBearerFragments(breadcrumb),
    beforeSend: (event) => redactBearerFragments(event),
    beforeSendTransaction: (event) => redactBearerFragments(event),
  });
}

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

// Required by the App Router so Sentry can trace client-side navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
