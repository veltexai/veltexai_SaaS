import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "./config";

/** Capture handled unexpected failures without proposal content or client PII. */
export function captureProposalFailure(
  flow: "quick" | "advanced",
  action: "generate" | "save",
  status?: number,
) {
  if (!isSentryEnabled || (status !== undefined && status >= 400 && status < 500)) return;
  try {
    Sentry.withScope((scope) => {
      scope.clearBreadcrumbs();
      scope.setTags({ flow, action, status_code: status ?? "network" });
      Sentry.captureException(new Error(`Proposal ${action} failed`));
    });
  } catch {
    // Observability must never interrupt proposal creation.
  }
}
