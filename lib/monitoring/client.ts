"use client";

import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "./config";

/**
 * Attaches the Supabase user id to subsequent Sentry events.
 * Intentionally id-only — no email or other PII is sent to Sentry.
 */
export function identifySentryUser(userId: string) {
  if (!isSentryEnabled || !userId) return;

  try {
    Sentry.setUser({ id: userId });
  } catch {
    // Monitoring must never affect authentication.
  }
}

export function resetSentryUser() {
  if (!isSentryEnabled) return;

  try {
    Sentry.setUser(null);
  } catch {
    // Monitoring must never affect logout.
  }
}
