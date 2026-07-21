"use client";

import posthog from "posthog-js";
import { isPostHogEnabled } from "./config";
import type { AnalyticsEventName } from "./events";
import type { AnalyticsProperties } from "./types";

export function captureEvent<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsProperties<E>,
) {
  if (!isPostHogEnabled) return;

  try {
    posthog.capture(event, properties);
  } catch {
    // Analytics must never affect product behavior.
  }
}

export function identifyUser(userId: string) {
  if (!isPostHogEnabled || !userId) return;

  try {
    if (posthog.get_distinct_id() !== userId) {
      posthog.identify(userId);
    }
  } catch {
    // Analytics must never affect authentication.
  }
}

export function resetAnalytics() {
  if (!isPostHogEnabled) return;

  try {
    posthog.reset();
  } catch {
    // Analytics must never affect logout.
  }
}
