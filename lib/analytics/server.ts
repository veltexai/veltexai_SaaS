import "server-only";

import { PostHog } from "posthog-node";
import { isPostHogEnabled, postHogConfig } from "./config";
import type { AnalyticsEventName } from "./events";
import type { ServerAnalyticsEvent } from "./types";

export async function captureServerEvent<E extends AnalyticsEventName>({
  distinctId,
  event,
  properties,
}: ServerAnalyticsEvent<E>): Promise<void> {
  if (
    !isPostHogEnabled ||
    !postHogConfig.key ||
    !postHogConfig.host ||
    !distinctId
  ) {
    return;
  }

  const client = new PostHog(postHogConfig.key, {
    host: postHogConfig.host,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    client.capture({ distinctId, event, properties });
    await client.shutdown();
  } catch {
    // Server analytics is best-effort and must not fail business requests.
    try {
      await client.shutdown();
    } catch {
      // Ignore shutdown failures too.
    }
  }
}
