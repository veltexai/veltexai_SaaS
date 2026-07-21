"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { isPostHogEnabled } from "@/lib/analytics/config";

const REPLAY_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/demo-proposal$/,
  /^\/auth\/(?:login|signup)$/,
  /^\/dashboard\/proposals\/(?:quick|new)$/,
  /^\/dashboard\/proposals\/[^/]+$/,
  /^\/dashboard\/billing$/,
] as const;

export function AnalyticsController() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isPostHogEnabled || process.env.NODE_ENV !== "production") return;

    const shouldRecord = REPLAY_ROUTE_PATTERNS.some((pattern) =>
      pattern.test(pathname),
    );

    try {
      if (shouldRecord) {
        posthog.startSessionRecording();
      } else {
        posthog.stopSessionRecording();
      }
    } catch {
      // Replay must never affect navigation.
    }
  }, [pathname]);

  return null;
}
