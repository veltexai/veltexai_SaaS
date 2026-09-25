import { createMockTeamAdapter, type MockTeamScenario } from "./mock-team-adapter";
import { createUnavailableTeamAdapter } from "./unavailable-team-adapter";
import type { TeamAdapter } from "../types/organization";

/**
 * Production fail-closed adapter resolution for the team settings page.
 *
 * The mock/fixture adapter is explicitly development-only. This is an
 * allow-list ("only `development` gets the mock"), not a deny-list ("only
 * `production` is blocked"), matching this repo's existing
 * `process.env.NODE_ENV === "development"` convention (see `lib/logger.ts`,
 * `app/api/proposals/[id]/send/route.ts`) rather than checking
 * `!== "production"`. That means any unrecognized, unset, staging, preview,
 * or test environment value fails closed to `UnavailableTeamAdapter` instead
 * of accidentally leaking fixture data — the caller must opt in to the mock
 * by name, not merely fail to opt out of production.
 *
 * `scenario` only has any effect when `nodeEnv === "development"`; it is
 * silently ignored otherwise, so a `?scenario=` query string can never
 * influence a non-development response, regardless of what a caller puts
 * in the URL.
 *
 * This function takes `nodeEnv` as an explicit parameter (rather than
 * reading `process.env.NODE_ENV` internally) specifically so it stays a
 * pure, directly unit-testable function — see
 * `features/organizations/__tests__/resolve-team-adapter.test.ts`.
 */
export function resolveTeamAdapter(
  nodeEnv: string | undefined,
  scenario?: MockTeamScenario,
): TeamAdapter {
  if (nodeEnv !== "development") {
    return createUnavailableTeamAdapter();
  }

  return createMockTeamAdapter(
    scenario ? { scenario, latencyMs: 300 } : { latencyMs: 300 },
  );
}
