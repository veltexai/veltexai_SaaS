import { resolveTeamAdapter } from "../lib/resolve-team-adapter";
import {
  TEAM_ADAPTER_INVITATIONS_UNAVAILABLE_MESSAGE,
  TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
} from "../lib/unavailable-team-adapter";
import { FIXTURE_ORGANIZATIONS } from "../lib/fixtures";

/**
 * This is the exact function the production page calls to resolve which
 * adapter to render. It is a pure function (env value passed in, not read
 * from `process.env` internally) specifically so these cases can be tested
 * directly and deterministically, without mutating global env state.
 */
describe("resolveTeamAdapter", () => {
  it("resolves the unavailable adapter for a production nodeEnv", async () => {
    const adapter = resolveTeamAdapter("production");
    await expect(adapter.listOrganizations()).rejects.toThrow(
      TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
    );
  });

  it("ignores a scenario override in production — cannot render fixtures via the query string", async () => {
    const adapter = resolveTeamAdapter("production", "empty");
    await expect(adapter.listOrganizations()).rejects.toThrow(
      TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
    );
  });

  it("ignores the error scenario override in production as well", async () => {
    const adapter = resolveTeamAdapter("production", "error");
    await expect(adapter.listOrganizations()).rejects.toThrow(
      TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
    );
    await expect(adapter.listMembers("org-veltex-cleaning")).rejects.toThrow(
      TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
    );
  });

  it("production adapter keeps invitations disabled and throws from inviteMember", async () => {
    const adapter = resolveTeamAdapter("production");
    await expect(adapter.getCapabilities()).rejects.toThrow(
      TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
    );
    await expect(
      adapter.inviteMember({
        organizationId: "org-veltex-cleaning",
        email: "someone@example.com",
        role: "viewer",
      }),
    ).rejects.toThrow(TEAM_ADAPTER_INVITATIONS_UNAVAILABLE_MESSAGE);
  });

  it("resolves the unavailable adapter when nodeEnv is unset (fails closed, not open)", async () => {
    const adapter = resolveTeamAdapter(undefined);
    await expect(adapter.listOrganizations()).rejects.toThrow(
      TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
    );
  });

  it("resolves the unavailable adapter for any non-development value (allow-list, not a deny-list)", async () => {
    for (const value of ["test", "staging", "preview", "not-a-real-env"]) {
      const adapter = resolveTeamAdapter(value);
      await expect(adapter.listOrganizations()).rejects.toThrow(
        TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
      );
    }
  });

  it("resolves a working mock adapter only for the literal development nodeEnv", async () => {
    const adapter = resolveTeamAdapter("development");
    const organizations = await adapter.listOrganizations();
    expect(organizations).toEqual(FIXTURE_ORGANIZATIONS);
  });

  it("applies the scenario override only in development", async () => {
    const adapter = resolveTeamAdapter("development", "empty");
    const members = await adapter.listMembers("org-veltex-cleaning");
    expect(members).toEqual([]);
  });

  it("keeps invitationsEnabled false in the development mock's default capabilities", async () => {
    const adapter = resolveTeamAdapter("development");
    await expect(adapter.getCapabilities()).resolves.toEqual({
      invitationsEnabled: false,
    });
  });
});
