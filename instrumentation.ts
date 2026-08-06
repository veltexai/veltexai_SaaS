import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Next.js 15 hook: captures unhandled errors from every API route,
// Server Component, and server action without touching those files.
export const onRequestError = Sentry.captureRequestError;
